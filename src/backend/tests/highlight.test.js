const HighlightHelper = require('../utils/highlight_helper');

describe('HighlightHelper XSS Safety Tests', () => {
  test('should sanitize malicious script tags in query', () => {
    const text = 'Normal text about JavaScript';
    const maliciousQuery = 'JavaScript<script>alert("xss")</script>';
    const highlighted = HighlightHelper.highlightText(text, maliciousQuery);
    
    expect(highlighted).not.toContain('<script>');
    expect(highlighted).toContain('<mark>JavaScript</mark>');
  });

  test('should sanitize HTML injection in query', () => {
    const text = 'Normal answer text';
    const maliciousQuery = '<img src="x" onerror="alert(1)">text';
    const highlighted = HighlightHelper.highlightText(text, maliciousQuery);
    
    expect(highlighted).not.toContain('<img');
    expect(highlighted).toContain('text');
  });

  test('should sanitize malicious HTML in content', () => {
    const maliciousText = 'Bad <script>alert("xss")</script> content';
    const query = 'content';
    const highlighted = HighlightHelper.highlightText(maliciousText, query);
    
    expect(highlighted).not.toContain('<script>');
    expect(highlighted).toContain('<mark>content</mark>');
  });

  test('should safely generate snippets with HTML content', () => {
    const maliciousText = 'Start <script>alert("xss")</script> middle <img src="x" onerror="alert(1)"> end';
    const query = 'middle';
    const snippet = HighlightHelper.generateSnippet(maliciousText, query);
    
    expect(snippet).not.toContain('<script>');
    expect(snippet).not.toContain('<img');
    expect(snippet).toContain('<mark>middle</mark>');
  });

  test('should handle nested HTML tags', () => {
    const text = '<div><p>Test content</p></div>';
    const query = 'content';
    const highlighted = HighlightHelper.highlightText(text, query);
    
    expect(highlighted).not.toContain('<div>');
    expect(highlighted).not.toContain('<p>');
    expect(highlighted).toContain('<mark>content</mark>');
  });
});

// TODO: Re-enable after deciding expected behavior for snippet length vs original text.
describe.skip('Highlight Functionality Tests', () => {
  test('should highlight exact matches', () => {
    const text = 'This is a test sentence';
    const query = 'test';
    const highlighted = HighlightHelper.highlightText(text, query);
    
    expect(highlighted).toBe('This is a <mark>test</mark> sentence');
  });

  test('should highlight multiple occurrences', () => {
    const text = 'Test this test and test again';
    const query = 'test';
    const highlighted = HighlightHelper.highlightText(text, query);
    
    expect(highlighted).toBe('<mark>Test</mark> this <mark>test</mark> and <mark>test</mark> again');
  });

  test('should generate relevant snippets', () => {
    const longText = 'This is a very long text. It contains some important information in the middle. And continues with more text.';
    const query = 'important';
    const snippet = HighlightHelper.generateSnippet(longText, query);
    
    expect(snippet).toContain('<mark>important</mark>');
    expect(snippet.length).toBeLessThan(longText.length);
    expect(snippet).toContain('...');
  });
});