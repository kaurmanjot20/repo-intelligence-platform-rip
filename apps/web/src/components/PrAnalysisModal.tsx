"use client"
import { useState } from "react"
import { X, GitPullRequest, Loader2, AlertCircle } from "lucide-react"
import { api, type PrAnalysisResult } from "../lib/api"

interface Props {
  repositoryId: string
  isOpen: boolean
  onClose: () => void
  onResult: (result: PrAnalysisResult) => void
}

export function PrAnalysisModal({ repositoryId, isOpen, onClose, onResult }: Props) {
  const [prUrl, setPrUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prUrl.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await api.prAnalysis.analyze(repositoryId, { prUrl: prUrl.trim() })
      onResult(result)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-medium">
            <GitPullRequest size={16} className="text-indigo-400" />
            Analyze Pull Request
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">GitHub PR URL</label>
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/42"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !prUrl.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <GitPullRequest size={13} />
              )}
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
