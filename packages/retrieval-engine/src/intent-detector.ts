import type { CopilotIntent } from '@rip/types'

const STOP_WORDS = new Set([
  'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of',
  'and', 'or', 'how', 'what', 'where', 'who', 'which', 'does', 'do',
  'work', 'handled', 'responsible', 'tell', 'me', 'give', 'show', 'this',
  'that', 'if', 'when', 'by', 'with', 'can', 'could', 'would', 'should',
])

export class IntentDetector {
  detect(question: string): CopilotIntent {
    const q = question.toLowerCase()

    if (/where\s+is|who\s+handles|which\s+service|what\s+is\s+responsible|who\s+owns/.test(q)) {
      return 'find-ownership'
    }
    if (/how\s+does|what\s+happens\s+when|trace|walk\s+me|step\s+through|flow/.test(q)) {
      return 'trace-flow'
    }
    if (/where\s+are|find\s+all|locate|show\s+me\s+all/.test(q)) {
      return 'locate-logic'
    }
    if (/what\s+breaks|what\s+depends|what\s+imports|who\s+uses|what\s+calls/.test(q)) {
      return 'explain-deps'
    }
    if (/explain|overview|architecture|describe|what\s+is\s+this|summarize/.test(q)) {
      return 'explain-arch'
    }

    return 'explain-arch'
  }

  extractKeywords(question: string): string[] {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  }
}
