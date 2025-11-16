const FAQ = require('../models/faq');

describe('FAQ helpers', () => {
  test('parseTags handles valid JSON string', () => {
    const row = { id: 1, tags: JSON.stringify(['one', 'two']), view_count: 5 };
    const parsed = FAQ.parseTags(row);
    expect(parsed).not.toBe(row);
    expect(Array.isArray(parsed.tags)).toBe(true);
    expect(parsed.tags).toEqual(['one', 'two']);
  });

  test('parseTags handles invalid JSON and returns empty array', () => {
    const row = { id: 2, tags: 'not-json' };
    const parsed = FAQ.parseTags(row);
    expect(parsed.tags).toEqual([]);
  });

  test('parseTags handles missing tags', () => {
    const row = { id: 3 };
    const parsed = FAQ.parseTags(row);
    expect(parsed.tags).toEqual([]);
  });

  test('formatRow sets defaults', () => {
    const row = { id: 4, tags: null };
    const formatted = FAQ.formatRow(row);
    expect(formatted.tags).toEqual([]);
    expect(formatted.view_count).toBe(0);
    expect(formatted.status).toBe('draft');
  });
});
