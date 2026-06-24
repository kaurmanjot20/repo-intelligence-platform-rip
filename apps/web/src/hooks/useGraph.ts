"use client"
import { useState, useEffect, useCallback } from "react"
import { api } from "../lib/api"
import type { GraphNode, GraphEdge, GraphSummary, NodeType } from "@rip/types"

// Above this node count the full graph would overwhelm the browser, so we load
// only the top-level structure and let the user drill into subtrees on demand.
const LAZY_THRESHOLD = 2000
const ROOT_TYPES: NodeType[] = ["repository", "service", "module", "controller"]

export function useGraphSummary(repoId: string | null) {
  const [summary, setSummary] = useState<GraphSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!repoId) return
    let alive = true
    setLoading(true)
    api.graph.summary(repoId)
      .then((d) => { if (alive) setSummary(d) })
      .catch((e) => { if (alive) setError((e as Error).message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [repoId])

  return { summary, loading, error }
}

export function useGraphData(repoId: string | null, summary: GraphSummary | null) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lazy, setLazy] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [expanding, setExpanding] = useState(false)

  useEffect(() => {
    // Wait for the summary so we can decide between a full and a lazy load.
    if (!repoId || !summary) return
    let alive = true
    const isLazy = summary.totalNodes > LAZY_THRESHOLD
    setLoading(true)
    setLazy(isLazy)
    setExpandedIds(new Set())
    const nodesPromise = isLazy ? api.graph.nodes(repoId, ROOT_TYPES) : api.graph.nodes(repoId)
    Promise.all([nodesPromise, api.graph.edges(repoId)])
      .then(([n, e]) => { if (alive) { setNodes(n); setEdges(e) } })
      .catch((e) => { if (alive) setError((e as Error).message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [repoId, summary])

  const expandNode = useCallback(async (nodeId: string) => {
    if (!repoId) return
    setExpanding(true)
    try {
      const rel = await api.graph.node(repoId, nodeId)
      setNodes((prev) => {
        const byId = new Map(prev.map((n) => [n.id, n]))
        byId.set(rel.node.id, rel.node)
        for (const o of rel.outgoing) byId.set(o.target.id, o.target)
        for (const i of rel.incoming) byId.set(i.source.id, i.source)
        return Array.from(byId.values())
      })
      setEdges((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]))
        for (const o of rel.outgoing) byId.set(o.edge.id, o.edge)
        for (const i of rel.incoming) byId.set(i.edge.id, i.edge)
        return Array.from(byId.values())
      })
      setExpandedIds((prev) => new Set(prev).add(nodeId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setExpanding(false)
    }
  }, [repoId])

  return { nodes, edges, loading, error, lazy, expandNode, expandedIds, expanding }
}
