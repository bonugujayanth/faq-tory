const { resetDb, createUser, getTmpDbPath } = require('./testUtils');
const FAQ = require('../models/faq');

beforeAll(async () => {
  const tmp = getTmpDbPath(`faqmodel-${Date.now()}.db`);
  await resetDb(tmp);
  // create a user to be author
  const u = await createUser({ name: 'M', email: `m${Date.now()}@ex.com`, password: 'pass', role: 'admin' });
  global.__TEST_USER__ = u;
});

test('update with no fields returns error', (done) => {
  FAQ.update(1, {}, (err) => {
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/No fields to update/);
    done();
  });
});

test('delete non-existent returns error', (done) => {
  FAQ.delete(99999, (err) => {
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/not found/);
    done();
  });
});

test('publish/archive on non-existent return error', (done) => {
  FAQ.publish(99999, (err) => {
    expect(err).toBeTruthy();
    FAQ.archive(99999, (err2) => {
      expect(err2).toBeTruthy();
      done();
    });
  });
});

test('create and increment view count', (done) => {
  const author = global.__TEST_USER__;
  FAQ.create({ question: 'x', answer: 'y', category_id: null, author_id: author.id, tags: ['t'], status: 'published' }, (err, faq) => {
    expect(err).toBeNull();
    expect(faq).toHaveProperty('id');
    const id = faq.id;
    FAQ.incrementViewCount(id, (err2, res) => {
      expect(err2).toBeNull();
      expect(res).toHaveProperty('changes');
      done();
    });
  });
});
