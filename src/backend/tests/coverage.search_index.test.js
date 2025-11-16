const SearchIndex = require('../models/search_index');

describe('SearchIndex focused tests', () => {
  let originalInstance;
  let originalDocuments;

  beforeEach(() => {
    // backup
    originalInstance = SearchIndex.instance;
    originalDocuments = new Map(SearchIndex.documents);

    // set a predictable fake instance
    SearchIndex.instance = {
      add: jest.fn(),
      search: jest.fn().mockReturnValue([{ ref: '1', score: 0.75 }])
    };

    SearchIndex.documents = new Map();
    SearchIndex.documents.set('1', { id: 1, question: 'Q1', answer: 'A1' });
  });

  afterEach(() => {
    // restore
    SearchIndex.instance = originalInstance;
    SearchIndex.documents = originalDocuments;
    jest.restoreAllMocks();
  });

  test('addDocument adds and stores document', async () => {
    const qa = { id: 2, question: 'q2', answer: 'a2' };
    SearchIndex.instance.add.mockClear();

    const ok = await SearchIndex.addDocument(qa);
    expect(ok).toBe(true);
    expect(SearchIndex.instance.add).toHaveBeenCalledWith({ id: 2, question: 'q2', answer: 'a2' });
    expect(SearchIndex.documents.get('2')).toEqual(qa);
  });

  test('addDocument returns false on instance.add error', async () => {
    SearchIndex.instance.add.mockImplementation(() => { throw new Error('boom'); });
    const ok = await SearchIndex.addDocument({ id: 3, question: 'x', answer: 'y' });
    expect(ok).toBe(false);
  });

  test('updateDocument replaces document and sets it', async () => {
    const qa = { id: 1, question: 'Q1-mod', answer: 'A1-mod' };
    const ok = await SearchIndex.updateDocument(qa);
    expect(ok).toBe(true);
    expect(SearchIndex.documents.get('1')).toEqual(qa);
    expect(SearchIndex.instance.add).toHaveBeenCalled();
  });

  test('removeDocument deletes document', async () => {
    expect(SearchIndex.documents.has('1')).toBe(true);
    const ok = await SearchIndex.removeDocument(1);
    expect(ok).toBe(true);
    expect(SearchIndex.documents.has('1')).toBe(false);
  });

  test('search returns mapped results with score', async () => {
    const results = await SearchIndex.search('something');
    expect(Array.isArray(results)).toBe(true);
    expect(results[0]).toHaveProperty('score', 0.75);
    expect(results[0]).toHaveProperty('id', 1);
  });

  test('checkHealth returns ok when search works', async () => {
    const res = await SearchIndex.checkHealth();
    expect(res).toHaveProperty('ok', true);
    expect(res).toHaveProperty('documentCount');
  });
});
