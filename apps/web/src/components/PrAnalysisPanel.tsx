"use client"
import { X, GitPullRequest, AlertTriangle } from "lucide-react"
import type { PrAnalysisResult } from "../lib/api"

interface Props {
  result: PrAnalysisResult
  onClose: () => void
  onNodeClick: (nodeId: string) => void
}

export function PrAnalysisPanel({ result, onClose, onNodeClick }: Props) {
  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
          <GitPullRequest size={15} className="text-indigo-400" />
          PR Impact Analysis
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Impact Summary
          </h3>
          <p className="text-zinc-300 leading-relaxed">{result.summary}</p>
          <p className="text-zinc-600 text-xs mt-2">{result.durationMs}ms</p>
        </div>

        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Changed Files ({result.changedFiles.length})
          </h3>
          <ul className="space-y-1">
            {result.changedFiles.map((f) => (
              <li
                key={f}
                className="text-zinc-400 text-xs font-mono bg-zinc-800/50 rounded px-2 py-1 truncate"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>

        {result.impactedNodes.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Impacted Nodes ({result.impactedNodes.length})
            </h3>
            <ul className="space-y-1.5">
              {result.impactedNodes.map((node) => (
                <li key={node.nodeId}>
                  <button
                    type="button"
                    onClick={() => onNodeClick(node.nodeId)}
                    className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors group"
                  >
                    <span
                      className={`mt-0.5 shrink-0 text-xs font-mono px-1 rounded ${
                        node.relationship === "CALLS"
                          ? "bg-orange-950 text-orange-400"
                          : "bg-blue-950 text-blue-400"
                      }`}
                    >
                      {node.relationship}
                    </span>
                    <div className="min-w-0">
                      <p className="text-zinc-200 group-hover:text-white truncate">
                        {node.name}
                      </p>
                      <p className="text-zinc-500 text-xs font-mono truncate">{node.file}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <AlertTriangle size={13} />
            No graph nodes found for changed files. Files may not have been ingested yet.
          </div>
        )}
      </div>
    </div>
  )
}
