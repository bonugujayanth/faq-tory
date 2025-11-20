const Feedback = require('../models/feedback');
const db = require('../models/db');

jest.mock('../models/db');

describe('Feedback Model - Extended Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should create feedback', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await Feedback.create(1, 'Great!', 5, 'user1');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should create feedback with low rating', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await Feedback.create(1, 'Not helpful', 1, 'user2');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should get feedback by ID', async () => {
    db.get = jest.fn((sql, id, callback) => {
      callback(null, { id: 1, rating: 5, comment: 'Good' });
    });
    const feedback = await Feedback.getById(1);
    expect(feedback.rating).toBe(5);
  });
  
  test('should get feedback for QA entry', async () => {
    db.all = jest.fn((sql, qaId, callback) => {
      callback(null, [{ rating: 5 }, { rating: 4 }]);
    });
    const feedback = await Feedback.getForQA(1);
    expect(Array.isArray(feedback)).toBe(true);
  });
  
  test('should calculate average rating', async () => {
    db.get = jest.fn((sql, qaId, callback) => {
      callback(null, { avgRating: 4.5 });
    });
    const avg = await Feedback.getAverageRating(1);
    expect(typeof avg).toBe('number');
  });
  
  test('should update feedback', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await Feedback.update(1, 'Updated comment', 4);
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should delete feedback', async () => {
    db.run = jest.fn((sql, params, callback) => callback(null));
    await Feedback.delete(1);
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should list all feedback', async () => {
    db.all = jest.fn((sql, callback) => {
      callback(null, [{ id: 1, rating: 5 }]);
    });
    const list = await Feedback.list();
    expect(Array.isArray(list)).toBe(true);
  });
  
  test('should filter feedback by rating range', async () => {
    db.all = jest.fn((sql, min, max, callback) => {
      callback(null, [{ rating: 4 }, { rating: 5 }]);
    });
    const filtered = await Feedback.filterByRating(4, 5);
    expect(Array.isArray(filtered)).toBe(true);
  });
});
