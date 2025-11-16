const { errorHandler } = require('../middleware/error');

describe('errorHandler middleware', () => {
  test('returns 500 and message by default', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const err = new Error('boom');

    errorHandler(err, req, res, null);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
  });

  test('includes error message in development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const err = new Error('boom');
    err.publicMessage = 'public';

    errorHandler(err, req, res, null);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'public', error: 'boom' }));
    process.env.NODE_ENV = orig;
  });
});
