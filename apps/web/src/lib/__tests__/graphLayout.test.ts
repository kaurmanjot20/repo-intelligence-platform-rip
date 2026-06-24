import type { GraphNode, GraphEdge, NodeType, EdgeType } from "@rip/types"
import { layoutGraph } from "../graphLayout"

function node(id: string, type: NodeType = "file"): GraphNode {
  return { id, type, label: id, repositoryId: "r", metadata: {} }
}

function edge(id: string, sourceId: string, targetId: string, type: EdgeType): GraphEdge {
  return { id, sourceId, targetId, type }
}

describe("layoutGraph", () => {
  it("returns an empty map for an empty graph", () => {
    expect(layoutGraph([], []).size).toBe(0)
  })

  it("assigns a coordinate to every node", () => {
    const nodes = [node("a"), node("b"), node("c")]
    const positions = layoutGraph(nodes, [])
    for (const n of nodes) {
      const p = positions.get(n.id)
      expect(p).toBeDefined()
      expect(Number.isFinite(p!.x)).toBe(true)
      expect(Number.isFinite(p!.y)).toBe(true)
    }
  })

  it("ranks a CONTAINS parent above its children (smaller y)", () => {
    const nodes = [node("repo", "repository"), node("child1"), node("child2")]
    const edges = [
      edge("e1", "repo", "child1", "CONTAINS"),
      edge("e2", "repo", "child2", "CONTAINS"),
    ]
    const positions = layoutGraph(nodes, edges)
    const parentY = positions.get("repo")!.y
    expect(positions.get("child1")!.y).toBeGreaterThan(parentY)
    expect(positions.get("child2")!.y).toBeGreaterThan(parentY)
  })

  it("places disconnected nodes too", () => {
    const nodes = [node("a"), node("lonely")]
    const edges = [edge("e1", "a", "a", "CALLS")]
    const positions = layoutGraph(nodes, edges)
    expect(positions.get("lonely")).toBeDefined()
  })

  it("is deterministic for the same input", () => {
    const nodes = [node("repo", "repository"), node("a"), node("b")]
    const edges = [
      edge("e1", "repo", "a", "CONTAINS"),
      edge("e2", "repo", "b", "CONTAINS"),
      edge("e3", "a", "b", "IMPORTS"),
    ]
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
