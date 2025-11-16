const request = require('supertest');
const app = require('../server');

(async () => {
  try {
    console.log('Signing up admin...');
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Debug Admin', email: 'debugadmin@test.com', password: 'password' });
    console.log('Signup status:', signup.statusCode);
    console.log('Signup body:', signup.body);

    console.log('Attempting login...');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'debugadmin@test.com', password: 'password' });
    console.log('Login status:', login.statusCode);
    console.log('Login body:', login.body);
  } catch (err) {
    console.error('Debug script error:', err);
  }
})();