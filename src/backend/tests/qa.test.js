const QA = require('../models/qa');

describe('QA Model Tests', () => {
  // Sample data for testing
  const sampleQuestion = 'What is the meaning of life?';
  const sampleAnswer = '42';
  let createdEntry;

  describe('Create Operation', () => {
    it('should create a new Q/A entry', async () => {
      createdEntry = await QA.create(sampleQuestion, sampleAnswer);
      
      expect(createdEntry).toBeInstanceOf(Object);
      expect(createdEntry).toHaveProperty('id');
      expect(typeof createdEntry.id).toBe('number');
      expect(createdEntry).toHaveProperty('question', sampleQuestion);
      expect(createdEntry).toHaveProperty('answer', sampleAnswer);
    });

    it('should throw an error if question is missing', async () => {
      await expect(QA.create(null, sampleAnswer))
        .rejects
        .toThrow();
    });

    it('should throw an error if answer is missing', async () => {
      await expect(QA.create(sampleQuestion, null))
        .rejects
        .toThrow();
    });
  });

  describe('Read Operations', () => {
    it('should get Q/A entry by ID', async () => {
      const entry = await QA.getById(createdEntry.id);
      
      expect(entry).toBeInstanceOf(Object);
      expect(entry).toHaveProperty('id', createdEntry.id);
      expect(entry).toHaveProperty('question', sampleQuestion);
      expect(entry).toHaveProperty('answer', sampleAnswer);
    });

    it('should get all Q/A entries', async () => {
      const entries = await QA.getAll();
      
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      
      const lastEntry = entries[0]; // Since we order by created_at DESC
      expect(lastEntry).toHaveProperty('id', createdEntry.id);
      expect(lastEntry).toHaveProperty('question', sampleQuestion);
      expect(lastEntry).toHaveProperty('answer', sampleAnswer);
    });

    it('should throw an error when getting non-existent entry', async () => {
      await expect(QA.getById(99999))
        .rejects
        .toThrow('Q/A entry not found');
    });
  });
});