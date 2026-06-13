import type { SupportedLanguage } from "@rip/types"
import path from "path"

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".java": "java",
}

export class LanguageDetector {
  detectFromFilePaths(filePaths: string[]): SupportedLanguage[] {
    const found = new Set<SupportedLanguage>()
    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase()
      const lang = EXTENSION_MAP[ext]
      if (lang) found.add(lang)
    }
    return Array.from(found)
  }
}
