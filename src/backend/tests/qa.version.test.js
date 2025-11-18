const QA = require('../models/qa');
// eslint-disable-next-line no-unused-vars
const _QAVersion = require('../models/qa_version');
const { setupTestDatabase } = require('./setup');

describe('QA Version Control Tests', () => {
  const sampleQuestion1 = 'What is Node.js?';
  const sampleAnswer1 = 'Node.js is a JavaScript runtime.';
  const sampleQuestion2 = 'What is Node.js?';
  const sampleAnswer2 = 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine.';

  beforeAll(async () => {
    await setupTestDatabase();
  });
  const sampleQuestion3 = 'What is Node.js?';
  const sampleAnswer3 = 'Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.';
  
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
      
      expect(updatedEntry).toHaveProperty('current_version', 2);
      
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(2);
      expect(versions[0]).toHaveProperty('version', 2);
      expect(versions[0]).toHaveProperty('answer', sampleAnswer2);
    });

    it('should maintain version history when updating multiple times', async () => {
      await QA.update(qaEntry.id, sampleQuestion3, sampleAnswer3);
      
      const versions = await QA.getVersionHistory(qaEntry.id);
      expect(versions).toHaveLength(3);
      expect(versions.map(v => v.version)).toEqual([3, 2, 1]);
      expect(versions[0]).toHaveProperty('answer', sampleAnswer3);
    });
  });

  describe('Version Rollback', () => {
    it('should allow rollback to previous version', async () => {
      const rolledBack = await QA.rollbackToVersion(qaEntry.id, 2);
      
      expect(rolledBack).toHaveProperty('current_version', 2);
      expect(rolledBack).toHaveProperty('answer', sampleAnswer2);
      
      const currentEntry = await QA.getById(qaEntry.id);
      expect(currentEntry).toHaveProperty('current_version', 2);
      expect(currentEntry).toHaveProperty('answer', sampleAnswer2);
    });

    it('should allow rollback to first version', async () => {
      const rolledBack = await QA.rollbackToVersion(qaEntry.id, 1);
      
      expect(rolledBack).toHaveProperty('current_version', 1);
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
      const versions = await QA.getVersionHistory(qaEntry.id);
      
      expect(versions).toHaveLength(3);
      expect(versions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ version: 3, answer: sampleAnswer3 }),
          expect.objectContaining({ version: 2, answer: sampleAnswer2 }),
          expect.objectContaining({ version: 1, answer: sampleAnswer1 })
        ])
      );
    });

    it('should maintain version history after rollback', async () => {
      await QA.rollbackToVersion(qaEntry.id, 2);
      const versions = await QA.getVersionHistory(qaEntry.id);
      
      expect(versions).toHaveLength(3);
    });
  });
});