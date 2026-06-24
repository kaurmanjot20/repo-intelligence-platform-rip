"use client"
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
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
    const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          nodes={toFlowNodes(nodes, highlightedId)}
          edges={toFlowEdges(edges)}
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

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 max-w-xs pointer-events-none">
          {(Object.entries(TYPE_COLORS) as [NodeType, string][])
            .filter(([type]) => nodes.some((n) => n.type === type))
            .map(([type, color]) => (
              <span key={type} className="flex items-center gap-1 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {type.replace(/_/g, " ")}
              </span>
            ))}
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
