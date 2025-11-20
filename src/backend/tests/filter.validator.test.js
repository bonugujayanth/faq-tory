const filterValidator = require('../utils/filter_validator');

describe('Filter Validator', () => {
  test('should validate string filters', () => {
    const result = filterValidator.validateFilter('test', 'string');
    expect(result).toBe(true);
  });
  
  test('should validate number filters', () => {
    const result = filterValidator.validateFilter(123, 'number');
    expect(result).toBe(true);
  });
  
  test('should validate array filters', () => {
    const result = filterValidator.validateFilter(['a', 'b'], 'array');
    expect(result).toBe(true);
  });
  
  test('should validate date filters', () => {
    const result = filterValidator.validateFilter('2025-11-20', 'date');
    expect(result).toBe(true);
  });
  
  test('should reject invalid types', () => {
    const result = filterValidator.validateFilter({}, 'string');
    expect(result).toBe(false);
  });
});
