import { TypeScriptParser } from "../languages/typescript.parser"

const FIXTURE_CLASS = `
import { Injectable } from "@nestjs/common"
import { UserService } from "./user.service"

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateUser(email: string): Promise<boolean> {
    return true
  }

  generateToken(userId: string): string {
    return "token"
  }
}

export function helperFn(x: number): number {
  return x * 2
}
`

const FIXTURE_IMPORTS_ONLY = `
import fs from "fs"
import path from "path"
import { createServer } from "http"
`

describe("TypeScriptParser", () => {
  const parser = new TypeScriptParser()

  it("extracts imports", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    expect(result.imports).toHaveLength(2)
    expect(result.imports[0]!.source).toBe("@nestjs/common")
    expect(result.imports[1]!.source).toBe("./user.service")
  })

  it("extracts class with methods", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    expect(result.classes).toHaveLength(1)
    expect(result.classes[0]!.name).toBe("AuthService")
    expect(result.classes[0]!.methods).toHaveLength(3)
  })

  it("extracts top-level exported function", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    const fn = result.functions.find((f) => f.name === "helperFn")
    expect(fn).toBeDefined()
    expect(fn!.isExported).toBe(true)
  })

  it("extracts multiple imports", () => {
    const result = parser.parse(FIXTURE_IMPORTS_ONLY, "src/index.ts", "repo-1")
    expect(result.imports).toHaveLength(3)
  })

  it("detects NestJS framework hint from @Injectable", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    const nestHint = result.frameworkHints.find((h) => h.framework === "nestjs")
    expect(nestHint).toBeDefined()
  })

  it("populates source location with line numbers", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    const cls = result.classes[0]!
    expect(cls.location.startLine).toBeGreaterThan(0)
    expect(cls.location.endLine).toBeGreaterThan(cls.location.startLine)
  })

  it("sets contentHash from source content", () => {
    const result = parser.parse(FIXTURE_CLASS, "src/auth.service.ts", "repo-1")
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
