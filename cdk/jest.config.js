module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFiles: ['<rootDir>/test/jest.setup.env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.after.env.ts'],
  globalSetup: '<rootDir>/test/jest.setup.ts',
  globalTeardown: '<rootDir>/test/jest.teardown.ts',
  verbose: true,
};
