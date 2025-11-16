const QA = require('../models/qa');
const fs = require('fs');
const path = require('path');
const { setupTestDatabase } = require('./setup');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_qa_model.db');
const dbPath = process.env.DB_PATH;

// Remove any existing test DB
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
} catch (e) {
  // ignore
}

const db = require('../models/db');

describe('QA Model Tests', () => {
  // Sample data for testing
  const sampleQuestion = 'What is the meaning of life?';
  const sampleAnswer = '42';
  let createdEntry;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll((done) => {
    try {
      if (db && typeof db.close === 'function') {
        db.close(() => {
          try {
            if (fs.existsSync(dbPath)) {
              fs.unlinkSync(dbPath);
            } 
          } catch (e) {}
          done();
        });
      } else {
        try {
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
          } 
        } catch (e) {}
        done();
      }
    } catch (e) {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        } 
      } catch (e) {}
      done();
    }
  });

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
      
      expect(typeof entry).toBe('object');
      expect(entry).toHaveProperty('id', createdEntry.id);
      expect(entry).toHaveProperty('question', sampleQuestion);
      expect(entry).toHaveProperty('answer', sampleAnswer);
    });

    it('should get all Q/A entries', async () => {
      const entries = await QA.getAll();
      
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      
      // Ensure at least one entry matches createdEntry
      const found = entries.find(e => e.id === createdEntry.id);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('question', sampleQuestion);
      expect(found).toHaveProperty('answer', sampleAnswer);
    });

    it('should throw an error when getting non-existent entry', async () => {
      await expect(QA.getById(99999))
        .rejects
        .toThrow('Q/A entry not found');
    });
  });
});