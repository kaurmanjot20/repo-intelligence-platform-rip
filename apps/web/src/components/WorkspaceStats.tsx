"use client"
import { Boxes, FileCode, GitFork, Network } from "lucide-react"
import type { Repository } from "@rip/types"

interface Props {
  repos: Repository[]
}

export function WorkspaceStats({ repos }: Props) {
  if (repos.length === 0) return null

  const ready = repos.filter((r) => r.status === "ready").length
  const totalFiles = repos.reduce((sum, r) => sum + (r.fileCount ?? 0), 0)
  const totalNodes = repos.reduce((sum, r) => sum + (r.nodeCount ?? 0), 0)
  const totalEdges = repos.reduce((sum, r) => sum + (r.edgeCount ?? 0), 0)

  const stats = [
    { icon: Boxes, label: "Repositories", value: `${ready}/${repos.length} ready` },
    { icon: FileCode, label: "Files", value: totalFiles.toLocaleString() },
    { icon: Network, label: "Nodes", value: totalNodes.toLocaleString() },
    { icon: GitFork, label: "Edges", value: totalEdges.toLocaleString() },
  ]

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Icon size={13} />
            {label}
          </span>
          <span className="text-lg font-semibold text-zinc-100">{value}</span>
        </div>
      ))}
    </section>
  )
}
