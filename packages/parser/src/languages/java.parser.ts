import Parser from "tree-sitter"
// @ts-ignore
import JavaLanguage from "tree-sitter-java"
import { sha256 } from "@rip/shared-utils"
import type { ParsedFile, ParsedImport, ParsedClass, ParsedFunction, FrameworkHint } from "@rip/types"

const PARSER_VERSION = "1.0.0"

export class JavaParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(JavaLanguage)
  }

  parse(source: string, filePath: string, repositoryId: string): ParsedFile {
    const t0 = Date.now()
    const tree = this.parser.parse(source)
    const root = tree.rootNode

    return {
      id: `${repositoryId}:${filePath}`,
      repositoryId,
      path: filePath,
      language: "java",
      contentHash: sha256(source),
      imports: this.extractImports(root),
      exports: [],
      classes: this.extractClasses(root, filePath),
      functions: [],
      frameworkHints: this.detectFrameworkHints(root),
      metadata: { parserVersion: PARSER_VERSION, parsedAt: new Date(), parseDurationMs: Date.now() - t0 },
    }
  }

  private extractImports(root: Parser.SyntaxNode): ParsedImport[] {
    const imports: ParsedImport[] = []
    this.walk(root, (node) => {
      if (node.type === "import_declaration") {
        const name = node.descendantsOfType("scoped_identifier")[0]
        if (name) imports.push({ source: name.text, specifiers: [], isDefault: false })
      }
    })
    return imports
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
        const methodDecls = body.childrenForFieldName("member")
        for (const m of methodDecls) {
          if (m.type === "method_declaration") {
            const mName = m.childForFieldName("name")
            if (mName) {
              methods.push({
                name: mName.text,
                params: [],
                isAsync: false,
                isExported: true,
                location: { filePath, startLine: m.startPosition.row + 1, endLine: m.endPosition.row + 1 },
              })
            }
          }
        }
      }

      classes.push({
        name: nameNode.text,
        implements: [],
        methods,
        isAbstract: node.children.some((c) => c.text === "abstract"),
        location: { filePath, startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 },
      })
    })
    return classes
  }

  private detectFrameworkHints(root: Parser.SyntaxNode): FrameworkHint[] {
    const hints: FrameworkHint[] = []
    const src = root.text
    if (src.includes("springframework")) hints.push({ framework: "spring", hint: "Spring import detected" })
    if (src.includes("@Controller") || src.includes("@RestController")) hints.push({ framework: "spring", hint: "Spring Controller" })
    if (src.includes("@Service")) hints.push({ framework: "spring", hint: "Spring Service" })
    return hints
  }

  private walk(node: Parser.SyntaxNode, visitor: (n: Parser.SyntaxNode) => void): void {
    visitor(node)
    for (const child of node.children) this.walk(child, visitor)
  }
}
