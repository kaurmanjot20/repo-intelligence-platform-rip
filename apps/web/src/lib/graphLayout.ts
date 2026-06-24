import dagre from "dagre"
import type { GraphNode, GraphEdge } from "@rip/types"

export interface XYPosition {
  x: number
  y: number
}

// Approximate node box used for spacing. Width grows with the label so wide
// labels do not overlap their neighbours; height is fixed.
const NODE_HEIGHT = 36
const CHAR_WIDTH = 7
const MIN_WIDTH = 80
const MAX_WIDTH = 220

// CONTAINS forms the containment tree and should dominate the ranking; other
// edge types are pulled in with a low weight so related nodes sit near each
// other without distorting the layers.
const CONTAINS_WEIGHT = 4
const DEPENDENCY_WEIGHT = 1

function nodeWidth(label: string): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, label.length * CHAR_WIDTH))
}

/**
 * Lay out a graph top-to-bottom using dagre, driven by the CONTAINS hierarchy.
 * Returns a map of node id → position. Pure: no React, no DOM, deterministic.
 */
export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): Map<string, XYPosition> {
  const positions = new Map<string, XYPosition>()
  if (nodes.length === 0) return positions

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  const known = new Set<string>()
  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth(n.label), height: NODE_HEIGHT })
    known.add(n.id)
  }

  for (const e of edges) {
    // Skip edges that reference a node we are not laying out.
    if (!known.has(e.sourceId) || !known.has(e.targetId)) continue
    g.setEdge(e.sourceId, e.targetId, {
      weight: e.type === "CONTAINS" ? CONTAINS_WEIGHT : DEPENDENCY_WEIGHT,
    })
  }

  dagre.layout(g)

  for (const id of known) {
    const n = g.node(id)
    // dagre centres nodes; expose top-left so callers can place boxes directly.
    positions.set(id, { x: n.x - n.width / 2, y: n.y - n.height / 2 })
  }

  return positions
}
