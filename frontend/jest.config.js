// Use CommonJS so Node can load this without ESM flags.
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transpile ESM deps used by msw and friends
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|@mswjs|until-async)/)',
  ],

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],

  // Keep thresholds at 0 while iterating; enforce later once you see ≥80%
  coverageThreshold: {
    global: { statements: 0, branches: 0, functions: 0, lines: 0 },
  },
};

module.exports = createJestConfig(customJestConfig);
