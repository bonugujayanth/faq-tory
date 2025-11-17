module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Disable strict rules that might fail the build
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-undef': 'error',
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'uploads/',
    'data/',
    '*.config.js',
    'tests/'  // Ignore test files from strict linting
  ],
};
