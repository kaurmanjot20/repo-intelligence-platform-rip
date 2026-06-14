import Parser from "tree-sitter"
// @ts-ignore — tree-sitter-typescript has no TS types
import TSLanguage from "tree-sitter-typescript"
import { sha256 } from "@rip/shared-utils"
import type { ParsedFile, ParsedImport, ParsedExport, ParsedClass, ParsedFunction, FrameworkHint, SupportedLanguage } from "@rip/types"

const PARSER_VERSION = "1.0.0"

export class TypeScriptParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(TSLanguage.typescript)
  }

  parse(source: string, filePath: string, repositoryId: string): ParsedFile {
    const t0 = Date.now()
    const tree = this.parser.parse(source)
    const root = tree.rootNode

    const imports = this.extractImports(root)
    const exports = this.extractExports(root)
    const classes = this.extractClasses(root, filePath)
    const functions = this.extractTopLevelFunctions(root, filePath)
    const frameworkHints = this.detectFrameworkHints(root)

    return {
      id: `${repositoryId}:${filePath}`,
      repositoryId,
      path: filePath,
      language: "typescript" as SupportedLanguage,
      contentHash: sha256(source),
      imports,
      exports,
      classes,
      functions,
      frameworkHints,
      metadata: {
        parserVersion: PARSER_VERSION,
        parsedAt: new Date(),
        parseDurationMs: Date.now() - t0,
      },
    }
  }

  private extractImports(root: Parser.SyntaxNode): ParsedImport[] {
    const imports: ParsedImport[] = []
    this.walk(root, (node) => {
      if (node.type !== "import_statement") return
      const sourceNode = node.childForFieldName("source")
      if (!sourceNode) return
      const source = sourceNode.text.replace(/['"]/g, "")
      const specifiers: string[] = []
      const importClause = node.childForFieldName("import_clause")
      if (importClause) {
        const namedImports = importClause.descendantsOfType("import_specifier")
        for (const spec of namedImports) specifiers.push(spec.text)
        const defaultId = importClause.childForFieldName("name")
        if (defaultId) specifiers.push(defaultId.text)
      }
      imports.push({ source, specifiers, isDefault: false })
    })
    return imports
  }

  private extractExports(root: Parser.SyntaxNode): ParsedExport[] {
    const exports: ParsedExport[] = []
    this.walk(root, (node) => {
      if (node.type === "export_statement") {
        const decl = node.child(1)
        if (decl) {
          const nameNode = decl.childForFieldName("name")
          if (nameNode) exports.push({ name: nameNode.text, isDefault: false })
        }
      }
    })
    return exports
  }

  private extractClasses(root: Parser.SyntaxNode, filePath: string): ParsedClass[] {
    const classes: ParsedClass[] = []
    this.walk(root, (node) => {
      if (node.type !== "class_declaration") return
      const nameNode = node.childForFieldName("name")
      if (!nameNode) return

      const body = node.childForFieldName("body")
      const methods: ParsedFunction[] = []
      if (body) {
        for (const method of body.children) {
          if (method.type === "method_definition") {
            const mName = method.childForFieldName("name")
            if (!mName) continue
            const mParams = method.descendantsOfType("formal_parameters")
            const params = mParams[0]?.children
              .filter((c) => c.type === "identifier")
              .map((c) => c.text) ?? []

            methods.push({
              name: mName.text,
              params,
              isAsync: method.children.some((c) => c.type === "async"),
              isExported: false,
              location: { filePath, startLine: method.startPosition.row + 1, endLine: method.endPosition.row + 1 },
            })
          }
        }
      }

      const extendsClause = node.childForFieldName("extends")
      const implementsClause = node.childForFieldName("implements")

      classes.push({
        name: nameNode.text,
        extends: extendsClause?.text,
        implements: implementsClause
          ? implementsClause.children.filter((c) => c.type === "type_identifier").map((c) => c.text)
          : [],
        methods,
        isAbstract: node.children.some((c) => c.text === "abstract"),
        location: { filePath, startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 },
      })
    })
    return classes
  }

  private extractTopLevelFunctions(root: Parser.SyntaxNode, filePath: string): ParsedFunction[] {
    const functions: ParsedFunction[] = []
    for (const child of root.children) {
      let fnNode = child
      let isExported = false

      if (child.type === "export_statement") {
        const decl = child.child(1)
        if (decl) { fnNode = decl; isExported = true }
      }

      if (fnNode.type === "function_declaration" || fnNode.type === "generator_function_declaration") {
        const nameNode = fnNode.childForFieldName("name")
        if (!nameNode) continue
        const params = fnNode.descendantsOfType("identifier")
          .filter((n) => n.parent?.type === "formal_parameters")
          .map((n) => n.text)

        functions.push({
          name: nameNode.text,
          params,
          isAsync: fnNode.children.some((c) => c.type === "async"),
          isExported,
          location: { filePath, startLine: fnNode.startPosition.row + 1, endLine: fnNode.endPosition.row + 1 },
        })
      }
    }
    return functions
  }

  private detectFrameworkHints(root: Parser.SyntaxNode): FrameworkHint[] {
    const hints: FrameworkHint[] = []
    const src = root.text
    if (src.includes("@nestjs/")) hints.push({ framework: "nestjs", hint: "@nestjs import detected" })
    if (src.includes("@angular/")) hints.push({ framework: "angular", hint: "@angular import detected" })
    if (src.includes("from \"react\"") || src.includes("from 'react'")) hints.push({ framework: "react", hint: "react import detected" })
    if (src.includes("express")) hints.push({ framework: "express", hint: "express import detected" })
    return hints
  }

  private walk(node: Parser.SyntaxNode, visitor: (n: Parser.SyntaxNode) => void): void {
    visitor(node)
    for (const child of node.children) this.walk(child, visitor)
  }
}
