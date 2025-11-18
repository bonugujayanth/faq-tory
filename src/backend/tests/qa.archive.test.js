const QA = require('../models/qa');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('QA Archive Tests', () => {
  const sampleQuestion = 'What is Node.js?';
  const sampleAnswer = 'Node.js is a JavaScript runtime.';
  let qaEntry;

  beforeEach(async () => {
    await setupTestDatabase();
    qaEntry = await QA.create(sampleQuestion, sampleAnswer);
  });

  describe('Archive Operations', () => {
    it('should archive an entry instead of deleting it', async () => {
      const result = await QA.archive(qaEntry.id);
      expect(result).toHaveProperty('archived', true);

      const entry = await QA.getById(qaEntry.id);
      expect(entry).toHaveProperty('archived', 1);
    });

    it('should exclude archived entries from default getAll', async () => {
      await QA.archive(qaEntry.id);
      
      const entries = await QA.getAll();
      expect(entries).not.toContainEqual(expect.objectContaining({ id: qaEntry.id }));
    });

    it('should include archived entries when specifically requested', async () => {
      await QA.archive(qaEntry.id);
      
      const entries = await QA.getAll(true);
      expect(entries).toContainEqual(expect.objectContaining({ id: qaEntry.id }));
    });

    it('should restore an archived entry', async () => {
      await QA.archive(qaEntry.id);
      const result = await QA.restore(qaEntry.id);
      
      expect(result).toHaveProperty('archived', false);
      
      const entry = await QA.getById(qaEntry.id);
      expect(entry).toHaveProperty('archived', 0);
    });

    it('should throw error when archiving non-existent entry', async () => {
      await expect(QA.archive(99999))
        .rejects
        .toThrow('Q/A entry not found');
    });
  });

  describe('Search and List Operations', () => {
    it('should exclude archived entries from search results by default', async () => {
      const question2 = 'What is Express.js?';
      const answer2 = 'Express.js is a web framework.';
      
      const entry2 = await QA.create(question2, answer2);
      await QA.archive(qaEntry.id);
      
      const entries = await QA.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveProperty('id', entry2.id);
    });
    
    it('should allow access to archived entries by ID', async () => {
      await QA.archive(qaEntry.id);
      
      const entry = await QA.getById(qaEntry.id);
      expect(entry).toHaveProperty('id', qaEntry.id);
      expect(entry).toHaveProperty('archived', 1);
    });
  });
});