import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from "d3-force"
import type { GraphNode, GraphEdge } from "@rip/types"

export interface XYPosition {
  x: number
  y: number
}

interface SimNode {
  id: string
  x: number
  y: number
}

interface SimLink {
  source: string
  target: string
}

// Static force-directed layout: connected nodes attract, all nodes repel, so the
// graph spreads across the viewport into readable clusters instead of one line.
const ITERATIONS = 300
const CHARGE = -260 // node-to-node repulsion (more negative = more spread)
const LINK_DISTANCE = 90
const LINK_STRENGTH = 0.35
const COLLIDE_RADIUS = 42 // keeps node boxes from overlapping

// Deterministic golden-angle spiral for the initial placement, so the simulation
// is fully reproducible (no Math.random) — same graph in, same picture out.
const GOLDEN_ANGLE = 2.399963229728653

/**
 * Lay out a graph with a force-directed simulation, run to a fixed number of
 * ticks. Returns a map of node id → position. Pure: no React, no DOM.
 */
export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): Map<string, XYPosition> {
  const positions = new Map<string, XYPosition>()
  if (nodes.length === 0) return positions

  const simNodes: SimNode[] = nodes.map((n, i) => {
    const radius = 12 * Math.sqrt(i)
    const angle = i * GOLDEN_ANGLE
    return { id: n.id, x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
  })

  const known = new Set(nodes.map((n) => n.id))
  const links: SimLink[] = edges
    // Skip edges that reference a node we are not laying out.
    .filter((e) => known.has(e.sourceId) && known.has(e.targetId))
    .map((e) => ({ source: e.sourceId, target: e.targetId }))

  const sim = forceSimulation<SimNode>(simNodes)
    .force("charge", forceManyBody<SimNode>().strength(CHARGE))
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(LINK_DISTANCE)
        .strength(LINK_STRENGTH)
    )
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide<SimNode>(COLLIDE_RADIUS))
    .stop()

  for (let i = 0; i < ITERATIONS; i++) sim.tick()

  for (const n of simNodes) positions.set(n.id, { x: n.x, y: n.y })
  return positions
}
