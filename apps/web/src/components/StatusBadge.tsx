import { clsx } from "clsx"
import type { IngestionStatus } from "@rip/types"

const COLORS: Record<IngestionStatus, string> = {
  pending: "bg-zinc-700 text-zinc-300",
  cloning: "bg-blue-900 text-blue-300",
  parsing: "bg-indigo-900 text-indigo-300",
  building_graph: "bg-purple-900 text-purple-300",
  indexing: "bg-cyan-900 text-cyan-300",
  ready: "bg-emerald-900 text-emerald-300",
  error: "bg-red-900 text-red-300",
  re_ingesting: "bg-amber-900 text-amber-300",
}

const DOTS: Partial<Record<IngestionStatus, boolean>> = {
  cloning: true, parsing: true, building_graph: true, indexing: true,
}

export function StatusBadge({ status }: { status: IngestionStatus }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium", COLORS[status])}>
      {DOTS[status] && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status.replace(/_/g, " ")}
    </span>
  )
}
