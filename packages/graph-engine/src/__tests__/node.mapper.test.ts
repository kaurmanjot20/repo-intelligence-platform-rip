import { mapParsedFileToGraph } from "../node.mapper"
import type { ParsedFile } from "@rip/types"

const FIXTURE: ParsedFile = {
  id: "repo-1:src/auth.service.ts",
  repositoryId: "repo-1",
  path: "src/auth.service.ts",
  language: "typescript",
  contentHash: "abc123",
  imports: [
    { source: "@nestjs/common", specifiers: ["Injectable"], isDefault: false },
    { source: "./user.service", specifiers: ["UserService"], isDefault: false },
  ],
  exports: [],
  classes: [
    {
      name: "AuthService",
      extends: undefined,
      implements: ["IAuthService"],
      methods: [
        { name: "login", params: ["email", "password"], isAsync: true, isExported: false, location: { filePath: "src/auth.service.ts", startLine: 10, endLine: 20 } },
      ],
      isAbstract: false,
      location: { filePath: "src/auth.service.ts", startLine: 5, endLine: 25 },
    },
  ],
  functions: [
    { name: "hashPassword", params: ["plain"], isAsync: false, isExported: true, location: { filePath: "src/auth.service.ts", startLine: 28, endLine: 32 } },
  ],
  frameworkHints: [{ framework: "nestjs", hint: "@nestjs import" }],
  metadata: { parserVersion: "1.0.0", parsedAt: new Date(), parseDurationMs: 5 },
}

describe("mapParsedFileToGraph", () => {
  it("creates a file node", () => {
    const { nodes } = mapParsedFileToGraph(FIXTURE)
    const fileNode = nodes.find((n) => n.id === FIXTURE.id)
    expect(fileNode).toBeDefined()
    expect(fileNode!.type).toBe("service") // .service.ts → service
  })

  it("creates a class node", () => {
    const { nodes } = mapParsedFileToGraph(FIXTURE)
    const classNode = nodes.find((n) => n.label === "AuthService")
    expect(classNode).toBeDefined()
    expect(classNode!.type).toBe("class")
  })

  it("creates a method node under the class", () => {
    const { nodes } = mapParsedFileToGraph(FIXTURE)
    const methodNode = nodes.find((n) => n.label === "login")
    expect(methodNode).toBeDefined()
    expect(methodNode!.type).toBe("function")
  })

  it("creates a top-level function node", () => {
    const { nodes } = mapParsedFileToGraph(FIXTURE)
    const fnNode = nodes.find((n) => n.label === "hashPassword")
    expect(fnNode).toBeDefined()
  })

  it("creates an external_dependency node for @nestjs/common import", () => {
    const { nodes } = mapParsedFileToGraph(FIXTURE)
    const extNode = nodes.find((n) => n.type === "external_dependency" && n.label === "@nestjs/common")
    expect(extNode).toBeDefined()
  })

  it("creates IMPORTS edge for external dependency", () => {
    const { edges } = mapParsedFileToGraph(FIXTURE)
    const importEdge = edges.find((e) => e.type === "IMPORTS" && e.targetId === "external:@nestjs/common")
    expect(importEdge).toBeDefined()
  })

  it("creates CONTAINS edges from file to class", () => {
    const { edges } = mapParsedFileToGraph(FIXTURE)
    const containsEdge = edges.find(
      (e) => e.type === "CONTAINS" && e.sourceId === FIXTURE.id && e.targetId.includes("AuthService"),
    )
    expect(containsEdge).toBeDefined()
  })

  it("creates IMPLEMENTS edge for class implements", () => {
    const { edges } = mapParsedFileToGraph(FIXTURE)
    const implEdge = edges.find((e) => e.type === "IMPLEMENTS")
    expect(implEdge).toBeDefined()
  })
})
