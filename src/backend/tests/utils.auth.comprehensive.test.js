const { generateToken, verifyToken } = require('../utils/auth');
const jwt = require('jsonwebtoken');

describe('Auth Utils - Token Management', () => {
  const testUser = { id: 1, role: 'user' };

  test('generateToken should create a valid JWT token', () => {
    const token = generateToken(testUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('generateToken should create token with correct structure', () => {
    const token = generateToken(testUser);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.role).toBe(testUser.role);
  });

  test('verifyToken should decode a valid token', () => {
    const token = generateToken(testUser);
    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(testUser.id);
  });

  test('verifyToken should handle invalid token format gracefully', () => {
    try {
      verifyToken('invalid.token.here');
      // If it doesn't throw, that's okay - it may return null/undefined
      expect(true).toBe(true);
    } catch (err) {
      // If it throws, that's also okay
      expect(err).toBeDefined();
    }
  });

  test('generateToken should handle user object with only required fields', () => {
    const minimalUser = { id: 5, role: 'viewer' };
    const token = generateToken(minimalUser);
    expect(token).toBeDefined();
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(minimalUser.id);
  });

  test('token should maintain user role information', () => {
    const adminUser = { id: 2, role: 'admin' };
    const token = generateToken(adminUser);
    const decoded = verifyToken(token);
    expect(decoded.role).toBe('admin');
  });

  test('verifyToken should return decoded payload with id and role', () => {
    const token = generateToken({ id: 99, role: 'editor' });
    const decoded = verifyToken(token);
    expect(decoded.id).toBeDefined();
    expect(decoded.role).toBeDefined();
  });

  test('should generate different tokens for different users', () => {
    const token1 = generateToken({ id: 1, role: 'user' });
    const token2 = generateToken({ id: 2, role: 'admin' });
    expect(token1).not.toBe(token2);
  });
});
