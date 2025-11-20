const authUtils = require('../utils/auth');

describe('Auth Utils', () => {
  test('should validate JWT tokens', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = authUtils.validateToken(token);
    expect(result).toBeDefined();
  });
  
  test('should hash passwords', () => {
    const password = 'test123';
    const hash = authUtils.hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });
  
  test('should compare passwords correctly', () => {
    const password = 'test123';
    const hash = authUtils.hashPassword(password);
    const result = authUtils.comparePassword(password, hash);
    expect(result).toBe(true);
  });
  
  test('should reject wrong passwords', () => {
    const password = 'test123';
    const hash = authUtils.hashPassword(password);
    const result = authUtils.comparePassword('wrong', hash);
    expect(result).toBe(false);
  });
});
