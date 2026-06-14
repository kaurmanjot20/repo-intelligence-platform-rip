import type { Chunk } from '@rip/types'
import type { RetrievedNode } from '@rip/retrieval-engine'

const MAX_GRAPH_NODES = 30
const MAX_CODE_CHUNKS = 8

const SYSTEM_PROMPT = `You are a code architecture expert analyzing a software repository.
Answer questions using ONLY the provided context — graph structure and code excerpts.
Be specific. Reference file paths and function names. Be concise (3–6 sentences max).
Do not speculate about code not shown in the context.`

export class ContextBuilder {
  buildPrompt(
    question: string,
    graphNodes: RetrievedNode[],
    chunks: Array<Chunk & { similarity: number }>
  ): string {
    const graphSection = graphNodes
      .slice(0, MAX_GRAPH_NODES)
      .map(n => `  [${n.type.toUpperCase()}] ${n.name}  →  ${n.filePath}`)
      .join('\n')

    const codeSection = chunks
      .slice(0, MAX_CODE_CHUNKS)
      .map(c =>
        `--- ${c.filePath} : ${c.startLine}–${c.endLine}  [${c.name}] ---\n${c.content}`
      )
      .join('\n\n')

    return `${SYSTEM_PROMPT}

RELEVANT REPOSITORY NODES:
${graphSection || '  (none found)'}

CODE EXCERPTS:
${codeSection || '  (no chunks indexed — run memory build first)'}

QUESTION: ${question}

Answer:`
  }
}
