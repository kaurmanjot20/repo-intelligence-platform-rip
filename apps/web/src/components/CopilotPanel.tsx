"use client"
import { useRef, useEffect, useState, type FormEvent } from "react"
import { useCopilot } from "../hooks/useCopilot"
import { CopilotCitationChip } from "./CopilotCitationChip"
import type { CopilotReference } from "@rip/types"

interface Props {
  repositoryId: string
  onCitationClick: (nodeId: string) => void
}

const EXAMPLE_QUESTIONS = [
  "How does authentication work?",
  "What services are in this codebase?",
  "Where is the main entry point?",
]

export function CopilotPanel({ repositoryId, onCitationClick }: Props) {
  const { messages, isLoading, ask } = useCopilot(repositoryId)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || isLoading) return
    setInput("")
    await ask(q)
  }

  const handleExample = (q: string) => {
    if (isLoading) return
    ask(q)
  }

  return (
    <div className="flex flex-col h-full border-l border-zinc-800 bg-zinc-950">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-sm font-semibold text-zinc-200">Repository Copilot</p>
        <p className="text-xs text-zinc-500 mt-0.5">Graph-aware answers about this codebase</p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        {messages.length === 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-zinc-500 text-center">
              Ask anything about this repository
            </p>
            <div className="space-y-1.5">
              {EXAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleExample(q)}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                msg.role === "user"
                  ? "bg-zinc-800 text-zinc-100 text-sm rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]"
                  : "text-zinc-300 text-sm max-w-full"
              }
            >
              {msg.role === "assistant" && (
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Copilot</div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {msg.role === "assistant" &&
                msg.references &&
                msg.references.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.references.map((ref: CopilotReference, j: number) => (
                      <CopilotCitationChip
                        key={j}
                        reference={ref}
                        onClick={() => onCitationClick(ref.nodeId)}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="text-xs text-zinc-500 px-1 animate-pulse">Thinking…</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this codebase…"
            disabled={isLoading}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  )
}
