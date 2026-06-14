module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@rip/types$': '<rootDir>/../types/src/index.ts',
    '^@rip/shared-utils$': '<rootDir>/../shared-utils/src/index.ts',
  },
}
