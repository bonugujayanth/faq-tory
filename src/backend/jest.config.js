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
    'models/feedback.js',
    'routes/search.js',
    'routes/feedback.js',
    'config/search.config.js'
  ]
};
