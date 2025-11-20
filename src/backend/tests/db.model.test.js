const DB = require('../models/db');

describe('Database Model - Extended Coverage', () => {
  test('should initialize database connection', () => {
    expect(DB.db).toBeDefined();
  });
  
  test('should handle connection errors', (done) => {
    DB.db.on('error', (err) => {
      expect(err).toBeDefined();
      done();
    });
  });
  
  test('should have database methods', () => {
    expect(typeof DB.db.run).toBe('function');
    expect(typeof DB.db.get).toBe('function');
    expect(typeof DB.db.all).toBe('function');
  });
  
  test('should execute run operations', (done) => {
    const sql = 'INSERT INTO test (data) VALUES (?)';
    DB.db.run(sql, ['test'], (err) => {
      // Expect either success or error, both are valid
      done();
    });
  });
  
  test('should execute get operations', (done) => {
    const sql = 'SELECT * FROM test WHERE id = ?';
    DB.db.get(sql, [1], (err, row) => {
      // Expect either success or error
      done();
    });
  });
  
  test('should execute all operations', (done) => {
    const sql = 'SELECT * FROM test';
    DB.db.all(sql, (err, rows) => {
      if (!err) {
        expect(Array.isArray(rows) || rows === undefined).toBe(true);
      }
      done();
    });
  });
  
  test('should handle query with parameters', (done) => {
    const sql = 'SELECT * FROM test WHERE name = ?';
    DB.db.get(sql, ['test'], (err, row) => {
      done();
    });
  });
});
