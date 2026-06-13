"use client"
import { useState } from "react"
import type { CreateRepoPayload } from "../lib/api"

const DEFAULT_WORKSPACE = "local-workspace"

interface Props {
  onSubmit: (payload: CreateRepoPayload) => Promise<unknown>
}

export function IngestionForm({ onSubmit }: Props) {
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim() || (url.split("/").at(-1) ?? url),
        sourceUrl: url.trim(),
        workspaceId: DEFAULT_WORKSPACE,
      })
      setUrl("")
      setName("")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Repository name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="url"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-[2] bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {loading ? "Ingesting…" : "Ingest"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
