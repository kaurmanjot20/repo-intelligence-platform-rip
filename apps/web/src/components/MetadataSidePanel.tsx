"use client"
import { useMemo, useState } from "react"
import { X } from "lucide-react"
import type { GraphNode, GraphEdge, NodeType } from "@rip/types"

type Tab = "imports" | "contains" | "usedBy"

interface Relation {
  node: GraphNode
  edgeType: string
}

interface Props {
  node: GraphNode
  nodes: GraphNode[]
  edges: GraphEdge[]
  onClose: () => void
  onNavigate: (nodeId: string) => void
}

export function MetadataSidePanel({ node, nodes, edges, onClose, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("imports")

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  const { imports, contains, usedBy } = useMemo(() => {
    const imports: Relation[] = []
    const contains: Relation[] = []
    const usedBy: Relation[] = []
    for (const e of edges) {
      if (e.sourceId === node.id) {
        const target = nodeById.get(e.targetId)
        if (!target) continue
        if (e.type === "CONTAINS") contains.push({ node: target, edgeType: e.type })
        else imports.push({ node: target, edgeType: e.type })
      } else if (e.targetId === node.id) {
        const source = nodeById.get(e.sourceId)
        if (source) usedBy.push({ node: source, edgeType: e.type })
      }
    }
    return { imports, contains, usedBy }
  }, [edges, node.id, nodeById])

  const tabs: { key: Tab; label: string; rows: Relation[] }[] = [
    { key: "imports", label: "Imports", rows: imports },
    { key: "contains", label: "Contains", rows: contains },
    { key: "usedBy", label: "Used By", rows: usedBy },
  ]
  const active = tabs.find((t) => t.key === tab)!

  const metaEntries = Object.entries(node.metadata ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  )

  return (
    <div className="absolute top-4 right-4 w-72 max-h-[calc(100%-2rem)] flex flex-col rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur shadow-xl text-sm overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-100 font-medium truncate">{node.label}</p>
          <p className="text-zinc-500 text-xs">{node.type.replace(/_/g, " ")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <X size={15} />
        </button>
      </div>

      {metaEntries.length > 0 && (
        <dl className="px-3 py-2 border-b border-zinc-800 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {metaEntries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-zinc-300 truncate" title={String(v)}>{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex border-b border-zinc-800 text-xs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-2 py-2 transition-colors ${
              tab === t.key
                ? "text-zinc-100 border-b-2 border-indigo-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label} {t.rows.length > 0 && <span className="text-zinc-600">({t.rows.length})</span>}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto">
        {active.rows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-600">No {active.label.toLowerCase()} relationships.</p>
        ) : (
          <ul className="py-1">
            {active.rows.map((r, i) => (
              <li key={`${r.node.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(r.node.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor(r.node.type)}`} />
                  <span className="flex-1 min-w-0 truncate text-zinc-300 text-xs">{r.node.label}</span>
                  <span className="text-[10px] text-zinc-600 shrink-0">{r.edgeType}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function dotColor(type: NodeType): string {
  const map: Partial<Record<NodeType, string>> = {
    repository: "bg-indigo-500",
    service: "bg-violet-500",
    module: "bg-sky-500",
    file: "bg-slate-500",
    class: "bg-emerald-500",
    function: "bg-amber-500",
    api: "bg-red-500",
    database: "bg-orange-500",
    controller: "bg-pink-500",
    interface: "bg-cyan-500",
    external_dependency: "bg-zinc-600",
  }
  return map[type] ?? "bg-zinc-600"
}
