"use client"
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Search } from "lucide-react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
  BackgroundVariant,
} from "reactflow"
import "reactflow/dist/style.css"
import type { GraphNode, GraphEdge, NodeType } from "@rip/types"
import { MetadataSidePanel } from "./MetadataSidePanel"

const TYPE_COLORS: Record<NodeType, string> = {
  repository: "#6366f1",
  service: "#8b5cf6",
  module: "#0ea5e9",
  file: "#64748b",
  class: "#10b981",
  function: "#f59e0b",
  api: "#ef4444",
  database: "#f97316",
  controller: "#ec4899",
  interface: "#06b6d4",
  external_dependency: "#374151",
}

function toFlowNodes(graphNodes: GraphNode[], highlightedId: string | null): Node[] {
  const COLS = Math.ceil(Math.sqrt(graphNodes.length)) || 1
  const H_GAP = 220
  const V_GAP = 100

  return graphNodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % COLS) * H_GAP, y: Math.floor(i / COLS) * V_GAP },
    data: { label: n.label, type: n.type },
    style: {
      background: TYPE_COLORS[n.type] ?? "#374151",
      color: "#fff",
      border: n.id === highlightedId ? "2px solid #f59e0b" : "none",
      boxShadow: n.id === highlightedId ? "0 0 12px #f59e0b88" : "none",
      borderRadius: 6,
      fontSize: 11,
      padding: "6px 10px",
      maxWidth: 180,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      transition: "border 0.2s, box-shadow 0.2s",
    },
  }))
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    label: e.type,
    style: { stroke: "#52525b", strokeWidth: 1 },
    labelStyle: { fontSize: 9, fill: "#a1a1aa" },
    animated: e.type === "IMPORTS",
  }))
}

export interface GraphExplorerHandle {
  focusNode: (nodeId: string) => void
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  loading: boolean
}

export const GraphExplorer = forwardRef<GraphExplorerHandle, Props>(
  function GraphExplorer({ nodes, edges, loading }, ref) {
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [hiddenTypes, setHiddenTypes] = useState<Set<NodeType>>(new Set())
    const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const presentTypes = useMemo(
      () =>
        (Object.keys(TYPE_COLORS) as NodeType[]).filter((t) =>
          nodes.some((n) => n.type === t)
        ),
      [nodes]
    )

    const visibleNodes = useMemo(
      () => nodes.filter((n) => !hiddenTypes.has(n.type)),
      [nodes, hiddenTypes]
    )

    const visibleEdges = useMemo(() => {
      const ids = new Set(visibleNodes.map((n) => n.id))
      return edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId))
    }, [edges, visibleNodes])

    const searchResults = useMemo(() => {
      const q = query.trim().toLowerCase()
      if (!q) return []
      return visibleNodes
        .filter((n) => n.label.toLowerCase().includes(q))
        .slice(0, 8)
    }, [query, visibleNodes])

    const toggleType = (type: NodeType) =>
      setHiddenTypes((prev) => {
        const next = new Set(prev)
        if (next.has(type)) next.delete(type)
        else next.add(type)
        return next
      })

    useImperativeHandle(
      ref,
      () => ({
        focusNode: (nodeId: string) => {
          if (highlightTimer.current !== null) clearTimeout(highlightTimer.current)
          setHighlightedId(nodeId)
          rfInstance?.fitView({
            nodes: [{ id: nodeId }],
            duration: 500,
            padding: 1.5,
          })
          highlightTimer.current = setTimeout(() => setHighlightedId(null), 3000)
        },
      }),
      [rfInstance]
    )

    const handleNodeClick: NodeMouseHandler = (_, node) => setSelectedId(node.id)

    const navigateTo = (nodeId: string) => {
      setSelectedId(nodeId)
      if (highlightTimer.current !== null) clearTimeout(highlightTimer.current)
      setHighlightedId(nodeId)
      rfInstance?.fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 1.5 })
      highlightTimer.current = setTimeout(() => setHighlightedId(null), 3000)
    }

    const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-500">
          Loading graph…
        </div>
      )
    }

    if (!nodes.length) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-500">
          No graph data yet. Ingestion may still be in progress.
        </div>
      )
    }

    return (
      <div className="h-full w-full relative">
        <ReactFlow
          nodes={toFlowNodes(visibleNodes, highlightedId)}
          edges={toFlowEdges(visibleEdges)}
          onInit={setRfInstance}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          attributionPosition="bottom-right"
        >
          <Background color="#27272a" variant={BackgroundVariant.Dots} gap={20} />
          <Controls className="!bg-zinc-800 !border-zinc-700 [&_button]:!bg-zinc-800 [&_button]:!text-zinc-400 [&_button]:!border-zinc-700" />
          <MiniMap
            nodeColor={(n) => TYPE_COLORS[(n.data as { type: NodeType }).type] ?? "#374151"}
            maskColor="rgba(0,0,0,0.7)"
            className="!bg-zinc-900 !border-zinc-700"
          />
        </ReactFlow>

        {/* Search */}
        <div className="absolute top-4 left-4 w-64">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur">
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes…"
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-1 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur overflow-hidden">
              {searchResults.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      navigateTo(n.id)
                      setQuery("")
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-zinc-800 transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: TYPE_COLORS[n.type] ?? "#374151" }}
                    />
                    <span className="flex-1 min-w-0 truncate text-xs text-zinc-300">{n.label}</span>
                    <span className="text-[10px] text-zinc-600 shrink-0">{n.type.replace(/_/g, " ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend / type filter */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 max-w-xs">
          {presentTypes.map((type) => {
            const hidden = hiddenTypes.has(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                title={hidden ? `Show ${type}` : `Hide ${type}`}
                className={`flex items-center gap-1 text-xs transition-opacity ${
                  hidden ? "text-zinc-600 opacity-50 line-through" : "text-zinc-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                {type.replace(/_/g, " ")}
              </button>
            )
          })}
        </div>

        {selectedNode && (
          <MetadataSidePanel
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            onClose={() => setSelectedId(null)}
            onNavigate={navigateTo}
          />
        )}
      </div>
    )
  }
)
