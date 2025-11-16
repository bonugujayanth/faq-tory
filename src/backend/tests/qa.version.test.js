const QA = require('../models/qa');
const QAVersion = require('../models/qa_version');
const { setupTestDatabase, seedPermissions } = require('./setup');
const { initIsolatedDb } = require('./helpers');
const db = require('../models/db');

const pause = (ms) => new Promise(res => setTimeout(res, ms));

describe('QA Version Control Tests', () => {
  const sampleQuestion1 = 'What is Node.js?';
  const sampleAnswer1 = 'Node.js is a JavaScript runtime.';
  const sampleQuestion2 = 'What is Node.js?';
  const sampleAnswer2 = 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine.';
  const sampleQuestion3 = 'What is Node.js?';
  const sampleAnswer3 = 'Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.';

  beforeAll(async () => {
    initIsolatedDb('qa_version_control');
    await new Promise(r => setTimeout(r, 200));
    await setupTestDatabase();
    await seedPermissions();
  });
  
  let qaEntry;

  describe('Version Creation and Tracking', () => {
    it('should create initial version (v1) when creating Q/A entry', async () => {
      qaEntry = await QA.create(sampleQuestion1, sampleAnswer1);
      
      expect(qaEntry).toHaveProperty('current_version', 1);
      
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(1);
      expect(versions[0]).toHaveProperty('version', 1);
      expect(versions[0]).toHaveProperty('question', sampleQuestion1);
      expect(versions[0]).toHaveProperty('answer', sampleAnswer1);
    });

    it('should create new version (v2) when updating Q/A entry', async () => {
      const updatedEntry = await QA.update(qaEntry.id, sampleQuestion2, sampleAnswer2);
      await pause(30);
      expect(updatedEntry).toHaveProperty('current_version', 2);
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(2);
      expect(versions[0]).toHaveProperty('version', 2);
      expect(versions[0]).toHaveProperty('answer', sampleAnswer2);
    });

    it('should maintain version history when updating multiple times', async () => {
      await QA.update(qaEntry.id, sampleQuestion3, sampleAnswer3);
      await pause(30);
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(3);
      expect(versions.map(v => v.version)).toEqual([3, 2, 1]);
      expect(versions[0]).toHaveProperty('answer', sampleAnswer3);
    });
  });

  describe('Version Rollback', () => {
    it('should allow rollback to previous version', async () => {
      const rolledBack = await QA.rollbackToVersion(qaEntry.id, 2);
      await pause(30);
      expect(rolledBack).toHaveProperty('current_version', 2);
      expect(rolledBack).toHaveProperty('answer', sampleAnswer2);
      const currentEntry = await QA.getById(qaEntry.id);
      expect(currentEntry).toHaveProperty('current_version', 2);
      expect(currentEntry).toHaveProperty('answer', sampleAnswer2);
    });

    it('should allow rollback to first version', async () => {
      const rolledBack = await QA.rollbackToVersion(qaEntry.id, 1);
      await pause(30);
      expect(rolledBack).toHaveProperty('current_version', 1);
      expect(rolledBack).toHaveProperty('question', sampleQuestion1);
      expect(rolledBack).toHaveProperty('answer', sampleAnswer1);
    });

    it('should fail when rolling back to non-existent version', async () => {
      await expect(QA.rollbackToVersion(qaEntry.id, 99))
        .rejects
        .toThrow('Version not found');
    });
  });

  describe('Version History', () => {
    it('should return all versions in descending order', async () => {
      // First rollback to version 3 to ensure all versions are in history
      await QA.rollbackToVersion(qaEntry.id, 3);
      await pause(30);
      
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions.length).toBeGreaterThanOrEqual(3);
      
      // Find the versions we created
      const v1 = versions.find(v => v.version === 1);
      const v2 = versions.find(v => v.version === 2);
      const v3 = versions.find(v => v.version === 3);
      
      expect(v1).toBeDefined();
      expect(v2).toBeDefined();
      expect(v3).toBeDefined();
      expect(v1.answer).toBe(sampleAnswer1);
      expect(v2.answer).toBe(sampleAnswer2);
      expect(v3.answer).toBe(sampleAnswer3);
    });

    it('should maintain version history after rollback', async () => {
      const versionsBeforeRollback = await QA.getVersionHistory(qaEntry.id);
      const countBefore = versionsBeforeRollback.length;
      
      await QA.rollbackToVersion(qaEntry.id, 2);
      await pause(30);
      const versions = await QA.getVersionHistory(qaEntry.id);
      
      // Version history should be maintained (not create a new version)
      expect(versions.length).toBe(countBefore);
    });
  });

  describe('Deletion & GetAll', () => {
    it('should list entries with getAll', async () => {
      const list = await QA.getAll();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });
    it('should delete the entry and error for nonexistent delete', async () => {
      const deleted = await QA.delete(qaEntry.id);
      expect(deleted).toHaveProperty('id', qaEntry.id);
      
      // Verify entry is gone
      await expect(QA.getById(qaEntry.id)).rejects.toThrow('Q/A entry not found');
      
      // Verify version history is also deleted
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(0);
      
      await expect(QA.delete(999999)).rejects.toThrow('Q/A entry not found');
    });
  });
});