module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  
  // Enable coverage collection by default
  collectCoverage: true,
  
  // Coverage reporters - MUST include 'json' for coverage-final.json
  coverageReporters: ['text', 'lcov', 'json', 'json-summary', 'html'],
  
  // Where to put coverage reports
  coverageDirectory: 'coverage',
  
  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!scripts/**',
    '!data/**',
    '!jest.config.js',
    '!app.js',
    '!.eslintrc.js',
    '!view-users.js'
  ],
  
  // Ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/scripts/',
    '/coverage/',
    '/data/'
  ],
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/*.test.js'
  ]
};
