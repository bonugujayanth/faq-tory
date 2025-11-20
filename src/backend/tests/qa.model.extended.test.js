const QA = require('../models/qa');
const db = require('../models/db');

jest.mock('../models/db');

describe('QA Model - Extended Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Create tests
  test('should create QA entry', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.create('Question?', 'Answer');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should create QA entry with category', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.create('Q?', 'A', 'cat1');
    expect(db.run).toHaveBeenCalled();
  });
  
  // Read tests
  test('should read QA entry', async () => {
    db.get = jest.fn((sql, id, callback) => {
      callback(null, { id: 1, question: 'Q?', answer: 'A' });
    });
    const qa = await QA.read(1);
    expect(qa.id).toBe(1);
  });
  
  test('should handle read error', async () => {
    db.get = jest.fn((sql, id, callback) => {
      callback(new Error('DB Error'));
    });
    await expect(QA.read(1)).rejects.toThrow();
  });
  
  // Update tests
  test('should update QA entry', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.update(1, 'New Q?', 'New A');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should update QA with category', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.update(1, 'Q?', 'A', 'cat2');
    expect(db.run).toHaveBeenCalled();
  });
  
  // Delete tests
  test('should delete QA entry', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.delete(1);
    expect(db.run).toHaveBeenCalled();
  });
  
  // List tests
  test('should list all QA entries', async () => {
    db.all = jest.fn((sql, callback) => {
      callback(null, [{ id: 1, question: 'Q?', answer: 'A' }]);
    });
    const items = await QA.list();
    expect(Array.isArray(items)).toBe(true);
  });
  
  test('should list QA by category', async () => {
    db.all = jest.fn((sql, cat, callback) => {
      callback(null, [{ id: 1, category: 'cat1' }]);
    });
    const items = await QA.listByCategory('cat1');
    expect(Array.isArray(items)).toBe(true);
  });
  
  // Search tests
  test('should search QA entries', async () => {
    db.all = jest.fn((sql, query, callback) => {
      callback(null, [{ id: 1, question: 'Question' }]);
    });
    const results = await QA.search('test');
    expect(Array.isArray(results)).toBe(true);
  });
  
  // Archive tests
  test('should archive QA entry', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.archive(1);
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should restore archived QA', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await QA.restore(1);
    expect(db.run).toHaveBeenCalled();
  });
  
  // Count tests
  test('should get count of QA entries', async () => {
    db.get = jest.fn((sql, callback) => {
      callback(null, { count: 10 });
    });
    const count = await QA.count();
    expect(typeof count).toBe('number');
  });
});
