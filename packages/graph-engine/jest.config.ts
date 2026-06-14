import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@rip/types$": "<rootDir>/../types/src/index.ts",
    "^@rip/shared-utils$": "<rootDir>/../shared-utils/src/index.ts",
  },
}

export default config
