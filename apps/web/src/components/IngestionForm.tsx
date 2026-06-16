"use client"
import { useState } from "react"
import { WebhookSetupPanel } from "./WebhookSetupPanel"

const DEFAULT_WORKSPACE = "local-workspace"
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

interface CreateRepoPayload {
  name: string
  sourceUrl: string
  workspaceId: string
  githubToken?: string
}

interface CreateRepoResponse {
  repositoryId: string
  jobId: string
  webhookSecret: string
}

interface Props {
  onSubmit: (payload: CreateRepoPayload) => Promise<CreateRepoResponse>
}

export function IngestionForm({ onSubmit }: Props) {
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [pat, setPat] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [webhookSetup, setWebhookSetup] = useState<{ repositoryId: string; webhookSecret: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await onSubmit({
        name: name.trim() || (url.split("/").at(-1) ?? url),
        sourceUrl: url.trim(),
        workspaceId: DEFAULT_WORKSPACE,
        githubToken: pat.trim() || undefined,
      })
      setPat("") // clear PAT from state immediately
      if (result.webhookSecret) {
        setWebhookSetup({ repositoryId: result.repositoryId, webhookSecret: result.webhookSecret })
      } else {
        setUrl("")
        setName("")
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (webhookSetup) {
    return (
      <WebhookSetupPanel
        repositoryId={webhookSetup.repositoryId}
        webhookSecret={webhookSetup.webhookSecret}
        apiBase={API_BASE}
      />
    )
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
      <div className="flex flex-col gap-1">
        <input
          type="password"
          placeholder="GitHub PAT (optional — required for private repositories)"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          autoComplete="off"
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
        <p className="text-zinc-600 text-xs">
          Used only for private GitHub repositories. Ignored for ZIP uploads.
        </p>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
