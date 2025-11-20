const Tags = require('../models/tags');
const db = require('../models/db');

jest.mock('../models/db');

describe('Tags Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should add a tag', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await Tags.addTag('new-tag', 'tag category');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should get all tags', async () => {
    db.all = jest.fn((sql, callback) => {
      callback(null, [{ id: 1, name: 'tag1' }]);
    });
    
    const tags = await Tags.getAllTags();
    expect(tags).toEqual([{ id: 1, name: 'tag1' }]);
  });
  
  test('should update tag', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await Tags.updateTag(1, 'updated-tag');
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should delete tag', async () => {
    db.run = jest.fn((sql, params, callback) => {
      callback(null);
    });
    
    await Tags.deleteTag(1);
    expect(db.run).toHaveBeenCalled();
  });
});
