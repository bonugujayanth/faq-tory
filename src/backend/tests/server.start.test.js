const { startServer } = require('../server');

describe('Server start script coverage (in-process)', () => {
  test('startServer initializes and logs listening message', () => {
    const server = startServer(4211);
    expect(server).toBeDefined();
    server.close();
  });

  test('startServer error handler covers EADDRINUSE branch without exiting', done => {
    const port = 4222;
    const s1 = startServer(port);
    // Attempt second server on same port to trigger error handler
    const s2 = startServer(port);
    let handled = false;
    s2.on('error', (err) => {
      expect(err.code).toBe('EADDRINUSE');
      handled = true;
      s1.close();
      // s2 will not be open, just ensure we reached handler
    });
    setTimeout(() => {
      expect(handled).toBe(true);
      done();
    }, 500);
  });
});