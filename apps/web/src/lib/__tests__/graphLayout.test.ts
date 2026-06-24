import type { GraphNode, GraphEdge, NodeType, EdgeType } from "@rip/types"
import { layoutGraph } from "../graphLayout"

function node(id: string, type: NodeType = "file"): GraphNode {
  return { id, type, label: id, repositoryId: "r", metadata: {} }
}

function edge(id: string, sourceId: string, targetId: string, type: EdgeType): GraphEdge {
  return { id, sourceId, targetId, type }
}

// A simple call chain a → b → c → d → e.
function chain(n: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const ids = Array.from({ length: n }, (_, i) => `n${i}`)
  const nodes = ids.map((id) => node(id))
  const edges = ids
    .slice(1)
    .map((id, i) => edge(`e${i}`, ids[i], id, "CALLS"))
  return { nodes, edges }
}

describe("layoutGraph", () => {
  it("returns an empty map for an empty graph", () => {
    expect(layoutGraph([], []).size).toBe(0)
  })

  it("assigns a finite coordinate to every node", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const positions = layoutGraph(nodes, [])
    for (const n of nodes) {
      const p = positions.get(n.id)
      expect(p).toBeDefined()
      expect(Number.isFinite(p!.x)).toBe(true)
      expect(Number.isFinite(p!.y)).toBe(true)
    }
  })

  it("scatters connected nodes across two dimensions, not a single line", () => {
    const { nodes, edges } = chain(6)
    const positions = layoutGraph(nodes, edges)
    const xs = nodes.map((n) => Math.round(positions.get(n.id)!.x))
    const ys = nodes.map((n) => Math.round(positions.get(n.id)!.y))
    // Nodes must spread on both axes — neither collapsed onto one row nor one column.
    expect(new Set(xs).size).toBeGreaterThan(1)
    expect(new Set(ys).size).toBeGreaterThan(1)
  })

  it("places disconnected nodes too", () => {
    const nodes = [node("a"), node("lonely")]
    const edges = [edge("e1", "a", "a", "CALLS")]
    const positions = layoutGraph(nodes, edges)
    expect(positions.get("lonely")).toBeDefined()
  })

  it("is deterministic for the same input", () => {
    const { nodes, edges } = chain(8)
    const first = layoutGraph(nodes, edges)
    const second = layoutGraph(nodes, edges)
    for (const [id, p] of first) {
      expect(second.get(id)).toEqual(p)
    }
  })

  it("does not throw when an edge references a missing node", () => {
    const nodes = [node("a")]
    const edges = [edge("e1", "a", "ghost", "IMPORTS")]
    expect(() => layoutGraph(nodes, edges)).not.toThrow()
    expect(layoutGraph(nodes, edges).get("a")).toBeDefined()
  })
})
