import type { ParsedFile } from "@rip/types"
import { TypeScriptParser } from "./typescript.parser"

export class JavaScriptParser {
  private tsParser: TypeScriptParser

  constructor() {
    this.tsParser = new TypeScriptParser()
  }

  parse(source: string, filePath: string, repositoryId: string): ParsedFile {
    const result = this.tsParser.parse(source, filePath, repositoryId)
    return { ...result, language: "javascript" }
  }
}
