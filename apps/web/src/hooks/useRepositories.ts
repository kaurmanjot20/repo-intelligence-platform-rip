"use client"
import { useState, useEffect, useCallback } from "react"
import { api, type CreateRepoPayload } from "../lib/api"
import type { Repository } from "@rip/types"

export function useRepositories() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.repositories.list()
      setRepos(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createRepo = useCallback(async (payload: CreateRepoPayload) => {
    const result = await api.repositories.create(payload)
    await load()
    return result
  }, [load])

  const removeRepo = useCallback(async (id: string) => {
    await api.repositories.remove(id)
    setRepos((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { repos, loading, error, refetch: load, createRepo, removeRepo }
}

export function useRepository(id: string) {
  const [repo, setRepo] = useState<Repository | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const data = await api.repositories.get(id)
        if (alive) setRepo(data)
        // Keep polling while ingestion is in progress
        if (alive && data.status !== "ready" && data.status !== "error") {
          setTimeout(poll, 2000)
        }
      } catch (e) {
        if (alive) setError((e as Error).message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    poll()
    return () => { alive = false }
  }, [id])

  return { repo, loading, error }
}
