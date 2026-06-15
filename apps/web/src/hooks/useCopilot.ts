"use client"
import { useState, useCallback } from "react"
import { api } from "../lib/api"
import type { CopilotReference } from "@rip/types"

export interface CopilotMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  references?: CopilotReference[]
}

export function useCopilot(repositoryId: string) {
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim()) return

      setMessages(prev => [...prev, { role: "user", content: question }])
      setIsLoading(true)

      try {
        const answer = await api.copilot.ask(repositoryId, question, sessionId)
        setSessionId(answer.sessionId)
        setMessages(prev => [
          ...prev,
          {
            id: answer.messageId,
            role: "assistant",
            content: answer.answer,
            references: answer.references,
          },
        ])
        return answer
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `Error: ${(err as Error).message}` },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [repositoryId, sessionId]
  )

  const clear = useCallback(() => {
    setMessages([])
    setSessionId(undefined)
  }, [])

  return { messages, isLoading, sessionId, ask, clear }
}
