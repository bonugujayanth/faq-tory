module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    '!models/search_index.js', // Exclude search_index from coverage
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/uploads/',
    '<rootDir>/data/'
  ],
  testTimeout: 10000,
  verbose: true,
  bail: false, // Continue running tests even if one fails
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
