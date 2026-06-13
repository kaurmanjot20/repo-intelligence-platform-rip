"use client"
import { useState, useEffect } from "react"
import { api } from "../lib/api"
import type { GraphNode, GraphEdge, GraphSummary } from "@rip/types"

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

export function useGraphData(repoId: string | null) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!repoId) return
    let alive = true
    setLoading(true)
    Promise.all([api.graph.nodes(repoId), api.graph.edges(repoId)])
      .then(([n, e]) => { if (alive) { setNodes(n); setEdges(e) } })
      .catch((e) => { if (alive) setError((e as Error).message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [repoId])

  return { nodes, edges, loading, error }
}
