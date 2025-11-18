// Validate and sanitize search filters
class FilterValidator {
  static validateDateString(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use ISO 8601 format (e.g., 2023-11-09T00:00:00Z)');
    }
    return date.toISOString();
  }

  static validateTags(tags) {
    if (!tags) return [];
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be provided as an array');
    }
    
    return tags.map(tag => {
      if (typeof tag !== 'string') {
        throw new Error('All tags must be strings');
      }
      // Remove any potential SQL injection or XSS attempts
      const sanitized = tag.replace(/[^a-zA-Z0-9-_]/g, '');
      if (sanitized !== tag) {
        throw new Error('Tags can only contain letters, numbers, hyphens, and underscores');
      }
      return sanitized;
    });
  }

  static validateFilters(filters) {
    const validatedFilters = {};

    if (filters.tags) {
      validatedFilters.tags = this.validateTags(filters.tags);
    }

    if (filters.createdAfter) {
      validatedFilters.createdAfter = this.validateDateString(filters.createdAfter);
    }
    if (filters.createdBefore) {
      validatedFilters.createdBefore = this.validateDateString(filters.createdBefore);
    }

    if (filters.updatedAfter) {
      validatedFilters.updatedAfter = this.validateDateString(filters.updatedAfter);
    }
    if (filters.updatedBefore) {
      validatedFilters.updatedBefore = this.validateDateString(filters.updatedBefore);
    }

    // Validate date ranges
    if (validatedFilters.createdAfter && validatedFilters.createdBefore) {
      if (new Date(validatedFilters.createdAfter) > new Date(validatedFilters.createdBefore)) {
        throw new Error('createdAfter must be before createdBefore');
      }
    }

    if (validatedFilters.updatedAfter && validatedFilters.updatedBefore) {
      if (new Date(validatedFilters.updatedAfter) > new Date(validatedFilters.updatedBefore)) {
        throw new Error('updatedAfter must be before updatedBefore');
      }
    }

    return validatedFilters;
  }
}

module.exports = FilterValidator;