import Link from "next/link"
import { Trash2, GitBranch, Code2, Network } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import type { Repository } from "@rip/types"

interface Props {
  repo: Repository
  onDelete: (id: string) => void
}

export function RepositoryCard({ repo, onDelete }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/repositories/${repo.id}`}
            className="text-zinc-100 font-medium hover:text-indigo-400 transition-colors truncate block"
          >
            {repo.name}
          </Link>
          {repo.sourceUrl && (
            <p className="text-zinc-500 text-xs mt-0.5 truncate">{repo.sourceUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={repo.status} />
          <button
            onClick={() => onDelete(repo.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors"
            aria-label="Delete repository"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {repo.status === "ready" && (
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {repo.fileCount !== undefined && (
            <span className="flex items-center gap-1">
              <Code2 size={12} /> {repo.fileCount} files
            </span>
          )}
          {repo.nodeCount !== undefined && (
            <span className="flex items-center gap-1">
              <Network size={12} /> {repo.nodeCount} nodes
            </span>
          )}
          {repo.defaultBranch && (
            <span className="flex items-center gap-1">
              <GitBranch size={12} /> {repo.defaultBranch}
            </span>
          )}
        </div>
      )}

      {repo.status === "error" && repo.errorMessage && (
        <p className="text-red-400 text-xs">{repo.errorMessage}</p>
      )}
    </div>
  )
}
