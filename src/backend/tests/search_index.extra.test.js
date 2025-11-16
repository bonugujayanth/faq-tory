const SearchIndex = require('../models/search_index');

describe('SearchIndex extra branch tests', () => {
  beforeEach(() => {
    // reset instance and documents
    SearchIndex.instance = null;
    SearchIndex.documents = new Map();
  });

  test('addDocument returns false when instance.add throws', async () => {
    SearchIndex.instance = { add: () => { throw new Error('boom-add'); } };
    const qa = { id: 100, question: 'Q', answer: 'A' };
    const res = await SearchIndex.addDocument(qa);
    expect(res).toBe(false);
    expect(SearchIndex.documents.has('100')).toBe(false);
  });

  test('updateDocument returns false when instance.add throws', async () => {
    SearchIndex.instance = { add: () => { throw new Error('boom-update'); } };
    const qa = { id: 101, question: 'Q2', answer: 'A2' };
    const res = await SearchIndex.updateDocument(qa);
    expect(res).toBe(false);
    expect(SearchIndex.documents.has('101')).toBe(false);
  });

  test('search returns empty array when instance.search throws', async () => {
    SearchIndex.instance = { search: () => { throw new Error('boom-search'); } };
    // ensure documents map has something so mapped would otherwise return
    SearchIndex.documents.set('200', { id: 200, question: 'Q', answer: 'A', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const res = await SearchIndex.search('anything');
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  test('checkHealth returns ok:false when instance.search throws', async () => {
    SearchIndex.instance = { search: () => { throw new Error('boom-health'); } };
    const health = await SearchIndex.checkHealth();
    expect(health.ok).toBe(false);
    expect(health.message).toMatch(/not responding|Search index is not responding/i);
  });

  test('removeDocument rebuilds index when no mock instance present', async () => {
    // spy on rebuildIndex
    const spy = jest.spyOn(SearchIndex, 'rebuildIndex').mockImplementation(() => {});
    SearchIndex.instance = null; // ensure no mock add
    SearchIndex.documents.set('300', { id: 300, question: 'X', answer: 'Y' });
    const res = await SearchIndex.removeDocument(300);
    expect(res).toBe(true);
    expect(SearchIndex.documents.has('300')).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
