import type { Config } from "jest"
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
} satisfies Config
