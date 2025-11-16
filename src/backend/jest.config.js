module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/scripts/',
    '/coverage/',
    '/data/'
  ],
  collectCoverageFrom: [
    'models/search/**/*.js',
    'models/search_index.js',
    'routes/search.js',
    'config/search.config.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
