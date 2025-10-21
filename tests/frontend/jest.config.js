const path = require('path')
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: path.resolve(__dirname, '../../'),
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases - let Jest resolve file extensions automatically
    '^@/lib/db/prisma$': '<rootDir>/../../src/lib/db/prisma',
    '^@/lib/db/(.*)$': '<rootDir>/../../src/lib/db/$1',
    '^@/lib/utils$': '<rootDir>/../../src/lib/utils/index',
    '^@/lib/utils/helpers$': '<rootDir>/../../src/lib/utils/helpers',
    '^@/lib/utils/language-colors$': '<rootDir>/../../src/lib/utils/language-colors',
    '^@/lib/utils/(.*)$': '<rootDir>/../../src/lib/utils/$1',
    '^@/lib/api/client$': '<rootDir>/../../src/lib/api/client',
    '^@/lib/api/(.*)$': '<rootDir>/../../src/lib/api/$1',
    '^@/lib/(.*)$': '<rootDir>/../../src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/../../src/components/$1',
    '^@/types/(.*)$': '<rootDir>/../../src/types/$1',
    '^@/app/(.*)$': '<rootDir>/../../app/$1',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/backend/',
    '<rootDir>/scraper/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)