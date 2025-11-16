const SearchIndex = require('../models/search_index');

describe('SearchIndex unit tests', () => {
  beforeEach(() => {
    // reset instance and documents
    SearchIndex.instance = null;
    SearchIndex.documents = new Map();
  });

  test('addDocument uses instance.add when available and stores document', async () => {
    const mockAdd = jest.fn();
    SearchIndex.instance = { add: mockAdd };

    const qaEntry = { id: 1, question: 'Hello world', answer: 'Test answer' };
    const res = await SearchIndex.addDocument(qaEntry);

    expect(res).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith({ id: qaEntry.id, question: qaEntry.question, answer: qaEntry.answer });
    expect(SearchIndex.documents.get('1')).toEqual(qaEntry);
  });

  test('updateDocument uses instance.add when available and replaces document', async () => {
    const mockAdd = jest.fn();
    SearchIndex.instance = { add: mockAdd };

    const old = { id: 2, question: 'Old', answer: 'Old' };
    SearchIndex.documents.set('2', old);

    const updated = { id: 2, question: 'New', answer: 'New' };
    const res = await SearchIndex.updateDocument(updated);

    expect(res).toBe(true);
    expect(mockAdd).toHaveBeenCalled();
    expect(SearchIndex.documents.get('2')).toEqual(updated);
  });

  test('removeDocument deletes doc and does not throw when mock instance present', async () => {
    const mockAdd = jest.fn();
    SearchIndex.instance = { add: mockAdd };
    SearchIndex.documents.set('3', { id: 3, question: 'X', answer: 'Y' });

    const res = await SearchIndex.removeDocument(3);
    expect(res).toBe(true);
    expect(SearchIndex.documents.has('3')).toBe(false);
  });

  test('search applies tag and date filters correctly', async () => {
    // Provide a mock instance.search and a documents map
    SearchIndex.instance = {
      search: (q) => [{ ref: '10', score: 0.9 }, { ref: '11', score: 0.5 }]
    };
    const now = new Date();
    const older = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
    SearchIndex.documents.set('10', { id: 10, question: 'Q1', answer: 'A1', tags: ['foo'], created_at: now.toISOString(), updated_at: now.toISOString() });
    SearchIndex.documents.set('11', { id: 11, question: 'Q2', answer: 'A2', tags: ['bar'], created_at: older, updated_at: older });

    const resultsAll = await SearchIndex.search('Q', {});
    expect(resultsAll.length).toBe(2);

    const resultsTag = await SearchIndex.search('Q', { tags: ['foo'] });
    expect(resultsTag.length).toBe(1);
    expect(resultsTag[0].id).toBe(10);

    const resultsDate = await SearchIndex.search('Q', { startDate: now.toISOString() });
    expect(resultsDate.length).toBe(1);
    expect(resultsDate[0].id).toBe(10);
  });

  test('checkHealth returns ok when instance responds', async () => {
    const mockSearch = jest.fn();
    SearchIndex.instance = { search: mockSearch };
    SearchIndex.documents = new Map();
    const health = await SearchIndex.checkHealth();
    expect(health.ok).toBe(true);
    expect(typeof health.documentCount).toBe('number');
  });
});

