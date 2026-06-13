"use client"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { StatusBadge } from "../../../components/StatusBadge"
import { GraphExplorer } from "../../../components/GraphExplorer"
import { useRepository } from "../../../hooks/useRepositories"
import { useGraphData, useGraphSummary } from "../../../hooks/useGraph"

export default function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { repo, loading: repoLoading, error: repoError } = useRepository(id)
  const { summary } = useGraphSummary(repo?.status === "ready" ? id : null)
  const { nodes, edges, loading: graphLoading } = useGraphData(repo?.status === "ready" ? id : null)

  if (repoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-zinc-500">Loading…</div>
    )
  }

  if (repoError || !repo) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400">
        {repoError ?? "Repository not found"}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-zinc-100 font-semibold truncate">{repo.name}</h1>
            <StatusBadge status={repo.status} />
          </div>
          {repo.sourceUrl && (
            <p className="text-zinc-500 text-xs mt-0.5 truncate">{repo.sourceUrl}</p>
          )}
        </div>

        {/* Stats */}
        {summary && (
          <div className="flex items-center gap-6 text-xs text-zinc-400 shrink-0">
            <span>{summary.totalNodes.toLocaleString()} nodes</span>
            <span>{summary.totalEdges.toLocaleString()} edges</span>
            {repo.fileCount && <span>{repo.fileCount} files</span>}
          </div>
        )}

        {repo.status !== "ready" && repo.status !== "error" && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
            <RefreshCw size={12} className="animate-spin" />
            Ingesting…
          </div>
        )}
      </header>

      {/* Graph area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        {repo.status === "error" ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-red-400 font-medium">Ingestion failed</p>
            {repo.errorMessage && (
              <p className="text-red-500 text-sm max-w-md text-center">{repo.errorMessage}</p>
            )}
          </div>
        ) : (
          <GraphExplorer nodes={nodes} edges={edges} loading={graphLoading} />
        )}
      </div>
    </div>
  )
}
