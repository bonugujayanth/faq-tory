const FilterValidator = require('../utils/filter_validator');

describe('Filter Validator - Input Validation and Sanitization', () => {
  
  describe('validateDateString', () => {
    test('should accept valid ISO 8601 date strings', () => {
      const result = FilterValidator.validateDateString('2023-11-09T00:00:00Z');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should return null for empty date string', () => {
      const result = FilterValidator.validateDateString('');
      expect(result).toBeNull();
    });

    test('should return null for null date', () => {
      const result = FilterValidator.validateDateString(null);
      expect(result).toBeNull();
    });

    test('should throw error for invalid date format', () => {
      expect(() => {
        FilterValidator.validateDateString('invalid-date');
      }).toThrow('Invalid date format');
    });

    test('should convert valid date to ISO format', () => {
      const result = FilterValidator.validateDateString('2023-11-09');
      expect(result).toBeDefined();
      expect(result.includes('Z')).toBe(true); // ISO format ends with Z
    });
  });

  describe('validateTags', () => {
    test('should accept valid tag arrays', () => {
      const result = FilterValidator.validateTags(['javascript', 'nodejs', 'backend']);
      expect(result).toEqual(['javascript', 'nodejs', 'backend']);
    });

    test('should return empty array for null tags', () => {
      const result = FilterValidator.validateTags(null);
      expect(result).toEqual([]);
    });

    test('should throw error if tags is not an array', () => {
      expect(() => {
        FilterValidator.validateTags('not-an-array');
      }).toThrow('Tags must be provided as an array');
    });

    test('should throw error if tag is not a string', () => {
      expect(() => {
        FilterValidator.validateTags([1, 2, 3]);
      }).toThrow('All tags must be strings');
    });

    test('should throw error for invalid characters in tags', () => {
      expect(() => {
        FilterValidator.validateTags(['tag@with#special$chars']);
      }).toThrow('Tags can only contain letters, numbers, hyphens, and underscores');
    });

    test('should allow hyphens and underscores in tags', () => {
      const result = FilterValidator.validateTags(['tag-with-hyphen', 'tag_with_underscore']);
      expect(result).toEqual(['tag-with-hyphen', 'tag_with_underscore']);
    });

    test('should sanitize and return valid alphanumeric tags with allowed symbols', () => {
      const result = FilterValidator.validateTags(['good-tag_123']);
      expect(result).toContain('good-tag_123');
    });
  });

  describe('validateFilters', () => {
    test('should accept empty filters object', () => {
      const result = FilterValidator.validateFilters({});
      expect(result).toEqual({});
    });

    test('should validate all filter types together', () => {
      const filters = {
        tags: ['javascript', 'testing'],
        createdAfter: '2023-01-01T00:00:00Z',
        createdBefore: '2023-12-31T23:59:59Z'
      };
      const result = FilterValidator.validateFilters(filters);
      expect(result.tags).toEqual(['javascript', 'testing']);
      expect(result.createdAfter).toBeDefined();
      expect(result.createdBefore).toBeDefined();
    });

    test('should throw error if createdAfter is after createdBefore', () => {
      expect(() => {
        FilterValidator.validateFilters({
          createdAfter: '2023-12-31T00:00:00Z',
          createdBefore: '2023-01-01T00:00:00Z'
        });
      }).toThrow('createdAfter must be before createdBefore');
    });

    test('should throw error if updatedAfter is after updatedBefore', () => {
      expect(() => {
        FilterValidator.validateFilters({
          updatedAfter: '2023-12-31T00:00:00Z',
          updatedBefore: '2023-01-01T00:00:00Z'
        });
      }).toThrow('updatedAfter must be before updatedBefore');
    });

    test('should accept valid date ranges', () => {
      const result = FilterValidator.validateFilters({
        createdAfter: '2023-01-01T00:00:00Z',
        createdBefore: '2023-12-31T23:59:59Z',
        updatedAfter: '2023-06-01T00:00:00Z',
        updatedBefore: '2023-06-30T23:59:59Z'
      });
      expect(result.createdAfter).toBeDefined();
      expect(result.createdBefore).toBeDefined();
      expect(result.updatedAfter).toBeDefined();
      expect(result.updatedBefore).toBeDefined();
    });

    test('should ignore undefined filter properties', () => {
      const result = FilterValidator.validateFilters({
        tags: ['test'],
        undefinedField: undefined
      });
      expect(result.tags).toBeDefined();
      expect(result.undefinedField).toBeUndefined();
    });
  });
});
