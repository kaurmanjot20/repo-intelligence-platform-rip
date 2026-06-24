import type { Config } from "jest"

// d3-force and its deps ship ESM only; transpile them (and our TS) to CommonJS.
const esmDeps = ["d3-force", "d3-quadtree", "d3-dispatch", "d3-timer"].join("|")

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.jest.json" }],
  },
  transformIgnorePatterns: [`node_modules/(?!\\.pnpm/)(?!(${esmDeps})/)`, `node_modules/\\.pnpm/(?!(${esmDeps})@)`],
} satisfies Config
