"use client"
import { use, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, MessageSquare, X, GitPullRequest, BarChart2 } from "lucide-react"
import { StatusBadge } from "../../../components/StatusBadge"
import { GraphExplorer, type GraphExplorerHandle } from "../../../components/GraphExplorer"
import { CopilotPanel } from "../../../components/CopilotPanel"
import { useRepository } from "../../../hooks/useRepositories"
import { useGraphData, useGraphSummary } from "../../../hooks/useGraph"
import { PrAnalysisModal } from "../../../components/PrAnalysisModal"
import { PrAnalysisPanel } from "../../../components/PrAnalysisPanel"
import type { PrAnalysisResult } from "../../../lib/api"

export default function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { repo, loading: repoLoading, error: repoError } = useRepository(id)
  const { summary } = useGraphSummary(repo?.status === "ready" ? id : null)
  const { nodes, edges, loading: graphLoading } = useGraphData(repo?.status === "ready" ? id : null)

  const [copilotOpen, setCopilotOpen] = useState(false)
  const [prModalOpen, setPrModalOpen] = useState(false)
  const [prAnalysisResult, setPrAnalysisResult] = useState<PrAnalysisResult | null>(null)
  const graphRef = useRef<GraphExplorerHandle>(null)

  const handleCitationClick = (nodeId: string) => {
    graphRef.current?.focusNode(nodeId)
  }

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

  const copilotAvailable = repo.status === "ready"

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
            {repo.status === "indexing" ? "Indexing memory…" : "Ingesting…"}
          </div>
        )}

        {/* Analyze PR button */}
        {copilotAvailable && (
          <button
            type="button"
            onClick={() => setPrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors shrink-0"
          >
            <GitPullRequest size={13} />
            Analyze PR
          </button>
        )}

        {/* Benchmarks link */}
        {copilotAvailable && (
          <Link
            href={`/repositories/${id}/benchmarks`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors shrink-0"
          >
            <BarChart2 size={13} />
            Benchmarks
          </Link>
        )}

        {/* Copilot toggle */}
        {copilotAvailable && (
          <button
            type="button"
            onClick={() => setCopilotOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
              copilotOpen
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {copilotOpen ? <X size={13} /> : <MessageSquare size={13} />}
            {copilotOpen ? "Close" : "Copilot"}
          </button>
        )}
      </header>

      {/* Main area: graph + optional copilot panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph */}
        <div
          className="relative overflow-hidden bg-zinc-950 transition-all duration-200"
          style={{ width: (copilotOpen || prAnalysisResult) ? "65%" : "100%" }}
        >
          {repo.status === "error" ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-red-400 font-medium">Ingestion failed</p>
              {repo.errorMessage && (
                <p className="text-red-500 text-sm max-w-md text-center">{repo.errorMessage}</p>
              )}
            </div>
          ) : (
            <GraphExplorer
              ref={graphRef}
              nodes={nodes}
              edges={edges}
              loading={graphLoading}
            />
          )}
        </div>

        {/* Right panel: PR Analysis or Copilot */}
        {(copilotOpen || prAnalysisResult) && (
          <div className="w-[35%] shrink-0 overflow-hidden">
            {prAnalysisResult ? (
              <PrAnalysisPanel
                result={prAnalysisResult}
                onClose={() => setPrAnalysisResult(null)}
                onNodeClick={handleCitationClick}
              />
            ) : (
              <CopilotPanel
                repositoryId={id}
                onCitationClick={handleCitationClick}
              />
            )}
          </div>
        )}
      </div>

      <PrAnalysisModal
        repositoryId={id}
        isOpen={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        onResult={(result) => {
          setPrAnalysisResult(result)
          setCopilotOpen(false)
        }}
      />
    </div>
  )
}
