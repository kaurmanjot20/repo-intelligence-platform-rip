import type { SupportedLanguage } from './repository'

export interface SourceLocation {
  filePath: string
  startLine: number
  endLine: number
}

export interface ParseMetadata {
  parserVersion: string
  parsedAt: Date
  parseDurationMs: number
}

export interface ParsedImport {
  source: string
  specifiers: string[]
  isDefault: boolean
}

export interface ParsedExport {
  name: string
  isDefault: boolean
}

export interface FrameworkHint {
  framework: string
  hint: string
}

export interface ParsedFunction {
  name: string
  params: string[]
  returnType?: string
  isAsync: boolean
  isExported: boolean
  location: SourceLocation
}

export interface ParsedClass {
  name: string
  extends?: string
  implements: string[]
  methods: ParsedFunction[]
  isAbstract: boolean
  location: SourceLocation
}

export interface ParsedFile {
  id: string
  repositoryId: string
  path: string
  language: SupportedLanguage
  contentHash: string
  imports: ParsedImport[]
  exports: ParsedExport[]
  classes: ParsedClass[]
  functions: ParsedFunction[]
  frameworkHints: FrameworkHint[]
  metadata: ParseMetadata
}
