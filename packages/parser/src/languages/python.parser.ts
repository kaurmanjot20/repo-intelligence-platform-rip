import Parser from "tree-sitter"
// @ts-ignore
import PythonLanguage from "tree-sitter-python"
import { sha256 } from "@rip/shared-utils"
import type { ParsedFile, ParsedImport, ParsedClass, ParsedFunction, FrameworkHint } from "@rip/types"

const PARSER_VERSION = "1.0.0"

export class PythonParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(PythonLanguage)
  }

  parse(source: string, filePath: string, repositoryId: string): ParsedFile {
    const t0 = Date.now()
    const tree = this.parser.parse(source)
    const root = tree.rootNode

    return {
      id: `${repositoryId}:${filePath}`,
      repositoryId,
      path: filePath,
      language: "python",
      contentHash: sha256(source),
      imports: this.extractImports(root),
      exports: [],
      classes: this.extractClasses(root, filePath),
      functions: this.extractFunctions(root, filePath),
      frameworkHints: this.detectFrameworkHints(root),
      metadata: { parserVersion: PARSER_VERSION, parsedAt: new Date(), parseDurationMs: Date.now() - t0 },
    }
  }

  private extractImports(root: Parser.SyntaxNode): ParsedImport[] {
    const imports: ParsedImport[] = []
    this.walk(root, (node) => {
      if (node.type === "import_statement") {
        const names = node.descendantsOfType("dotted_name")
        for (const n of names) imports.push({ source: n.text, specifiers: [], isDefault: false })
      } else if (node.type === "import_from_statement") {
        const module = node.childForFieldName("module_name")
        if (!module) return
        const names = node.descendantsOfType("import_specifier").map((s) => s.text)
        imports.push({ source: module.text, specifiers: names, isDefault: false })
      }
    })
    return imports
  }

  private extractClasses(root: Parser.SyntaxNode, filePath: string): ParsedClass[] {
    const classes: ParsedClass[] = []
    this.walk(root, (node) => {
      if (node.type !== "class_definition") return
      const nameNode = node.childForFieldName("name")
      if (!nameNode) return

      const body = node.childForFieldName("body")
      const methods: ParsedFunction[] = []
      if (body) {
        for (const child of body.children) {
          if (child.type === "function_definition") {
            const mName = child.childForFieldName("name")
            if (mName) {
              methods.push({
                name: mName.text,
                params: [],
                isAsync: child.children.some((c) => c.type === "async"),
                isExported: true,
                location: { filePath, startLine: child.startPosition.row + 1, endLine: child.endPosition.row + 1 },
              })
            }
          }
        }
      }

      classes.push({
        name: nameNode.text,
        implements: [],
        methods,
        isAbstract: false,
        location: { filePath, startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 },
      })
    })
    return classes
  }

  private extractFunctions(root: Parser.SyntaxNode, filePath: string): ParsedFunction[] {
    const functions: ParsedFunction[] = []
    for (const child of root.children) {
      if (child.type === "function_definition") {
        const nameNode = child.childForFieldName("name")
        if (!nameNode) continue
        functions.push({
          name: nameNode.text,
          params: [],
          isAsync: child.children.some((c) => c.type === "async"),
          isExported: true,
          location: { filePath, startLine: child.startPosition.row + 1, endLine: child.endPosition.row + 1 },
        })
      }
    }
    return functions
  }

  private detectFrameworkHints(root: Parser.SyntaxNode): FrameworkHint[] {
    const hints: FrameworkHint[] = []
    const src = root.text
    if (src.includes("fastapi") || src.includes("FastAPI")) hints.push({ framework: "fastapi", hint: "FastAPI detected" })
    if (src.includes("flask") || src.includes("Flask")) hints.push({ framework: "flask", hint: "Flask detected" })
    if (src.includes("django")) hints.push({ framework: "django", hint: "Django detected" })
    return hints
  }

  private walk(node: Parser.SyntaxNode, visitor: (n: Parser.SyntaxNode) => void): void {
    visitor(node)
    for (const child of node.children) this.walk(child, visitor)
  }
}
