import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // ── Projects: one per service + shared ──────────────────────────
  projects: [
    // Unit tests — Product Service
    {
      displayName: 'unit:product',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/product/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.ts'],
    },

    // Unit tests — Order Service
    {
      displayName: 'unit:order',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/order/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
    },

    // Unit tests — Payment Service
    {
      displayName: 'unit:payment',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/payment/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
    },

    // Unit tests — User Service
    {
      displayName: 'unit:user',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/user/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
    },

    // Integration tests — cross-service
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
      globalSetup: '<rootDir>/tests/setup/integration.globalSetup.ts',
      globalTeardown: '<rootDir>/tests/setup/integration.globalTeardown.ts',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],
    },

    // E2E tests — full system
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      moduleNameMapper: {
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
      },
      globalSetup: '<rootDir>/tests/setup/e2e.globalSetup.ts',
      globalTeardown: '<rootDir>/tests/setup/e2e.globalTeardown.ts',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.ts'],
    },
  ],

  // ── Coverage ────────────────────────────────────────────────────
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
