import { LanguageDetector } from "../language.detector"
import type { SupportedLanguage } from "@rip/types"

describe("LanguageDetector", () => {
  const detector = new LanguageDetector()

  it("detects TypeScript from .ts extensions", () => {
    expect(detector.detectFromFilePaths(["src/index.ts", "src/app.ts"])).toContain<SupportedLanguage>("typescript")
  })

  it("detects JavaScript when no TS files present", () => {
    const result = detector.detectFromFilePaths(["index.js", "utils.js"])
    expect(result).toContain<SupportedLanguage>("javascript")
    expect(result).not.toContain("typescript")
  })

  it("detects Python from .py extensions", () => {
    expect(detector.detectFromFilePaths(["main.py", "utils.py"])).toContain<SupportedLanguage>("python")
  })

  it("detects Java from .java extensions", () => {
    expect(detector.detectFromFilePaths(["Main.java", "Service.java"])).toContain<SupportedLanguage>("java")
  })

  it("detects multiple languages in mixed repo", () => {
    const result = detector.detectFromFilePaths(["src/index.ts", "scripts/build.py", "server/Main.java"])
    expect(result).toContain("typescript")
    expect(result).toContain("python")
    expect(result).toContain("java")
  })

  it("returns empty array for unknown extensions", () => {
    expect(detector.detectFromFilePaths(["README.md", "Makefile"])).toHaveLength(0)
  })
})
