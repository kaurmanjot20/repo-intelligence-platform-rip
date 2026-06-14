import fs from "fs/promises"
import path from "path"
import { glob } from "glob"
import { createLogger, ParseError } from "@rip/shared-utils"
import type { IParser, ParsedFile, SupportedLanguage } from "@rip/types"
import { TypeScriptParser } from "./languages/typescript.parser"
import { JavaScriptParser } from "./languages/javascript.parser"
import { PythonParser } from "./languages/python.parser"
import { JavaParser } from "./languages/java.parser"
import { AstWriter } from "./ast-writer"

const log = createLogger("ParserService")

const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
  ".py": "python",
  ".java": "java",
}

export class ParserService implements IParser {
  private readonly tsParser = new TypeScriptParser()
  private readonly jsParser = new JavaScriptParser()
  private readonly pyParser = new PythonParser()
  private readonly javaParser = new JavaParser()
  private readonly astWriter: AstWriter

  constructor(dataDir = process.env.DATA_DIR ?? "./data/repositories") {
    this.astWriter = new AstWriter(dataDir)
  }

  async parseRepository(repositoryPath: string, languages: SupportedLanguage[], repositoryId: string): Promise<ParsedFile[]> {
    const patterns = languages.flatMap((lang) => {
      if (lang === "typescript") return ["**/*.ts", "**/*.tsx"]
      if (lang === "javascript") return ["**/*.js", "**/*.jsx", "**/*.mjs"]
      if (lang === "python") return ["**/*.py"]
      if (lang === "java") return ["**/*.java"]
      return []
    })

    const files = await glob(patterns, {
      cwd: repositoryPath,
      nodir: true,
      ignore: ["node_modules/**", ".git/**", "dist/**", "**/__pycache__/**"],
    })

    log.info("Parsing repository", { repositoryPath, fileCount: files.length })

    const results: ParsedFile[] = []
    for (const relPath of files) {
      const absPath = path.join(repositoryPath, relPath)
      const ext = path.extname(relPath).toLowerCase()
      const lang = EXTENSION_TO_LANGUAGE[ext]
      if (!lang) continue

      try {
        const parsed = await this.parseFileWithId(absPath, lang, repositoryId)
        await this.astWriter.write(parsed)
        results.push(parsed)
      } catch (err) {
        log.warn("Failed to parse file, skipping", { file: relPath, error: (err as Error).message })
      }
    }

    log.info("Parsing complete", { fileCount: results.length })
    return results
  }

  async parseFile(filePath: string, language: SupportedLanguage): Promise<ParsedFile> {
    return this.parseFileWithId(filePath, language, "unknown")
  }

  private async parseFileWithId(filePath: string, language: SupportedLanguage, repositoryId: string): Promise<ParsedFile> {
    const source = await fs.readFile(filePath, "utf-8")

    try {
      switch (language) {
        case "typescript": return this.tsParser.parse(source, filePath, repositoryId)
        case "javascript": return this.jsParser.parse(source, filePath, repositoryId)
        case "python": return this.pyParser.parse(source, filePath, repositoryId)
        case "java": return this.javaParser.parse(source, filePath, repositoryId)
        default: throw new ParseError(`Unsupported language: ${language}`, filePath)
      }
    } catch (err) {
      if (err instanceof ParseError) throw err
      throw new ParseError(`Parse failed for ${filePath}: ${(err as Error).message}`, filePath, err)
    }
  }
}
