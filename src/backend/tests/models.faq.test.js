const FAQ = require('../models/faq');
const db = require('../models/db');

jest.mock('../models/db');

describe('FAQ Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should create FAQ', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await FAQ.create('Question?', 'Answer');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should read FAQ', async () => {
    db.get = jest.fn((sql, id, callback) => {
      callback(null, { id: 1, question: 'Q?', answer: 'A' });
    });
    
    const faq = await FAQ.read(1);
    expect(faq).toEqual({ id: 1, question: 'Q?', answer: 'A' });
  });
  
  test('should update FAQ', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await FAQ.update(1, 'New Q?', 'New A');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should delete FAQ', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await FAQ.delete(1);
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should list all FAQs', async () => {
    db.all = jest.fn((sql, callback) => {
      callback(null, [
        { id: 1, question: 'Q1?', answer: 'A1' },
        { id: 2, question: 'Q2?', answer: 'A2' }
      ]);
    });
    
    const faqs = await FAQ.list();
    expect(faqs).toHaveLength(2);
  });
});
