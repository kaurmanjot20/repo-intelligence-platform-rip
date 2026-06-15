"use client"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart2 } from "lucide-react"
import { api, type IngestionMetricData, type CopilotMessageMetric } from "../../../../lib/api"

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === 1) return <span className="text-emerald-400">👍</span>
  if (rating === -1) return <span className="text-red-400">👎</span>
  return <span className="text-zinc-600">—</span>
}

export default function BenchmarksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ingestionMetrics, setIngestionMetrics] = useState<IngestionMetricData[]>([])
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessageMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [im, cm] = await Promise.all([
          api.benchmarks.ingestion(id),
          api.benchmarks.copilot(id),
        ])
        if (!cancelled) {
          setIngestionMetrics(im.metrics)
          setCopilotMessages(cm.messages)
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link
          href={`/repositories/${id}`}
          className="text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-indigo-400" />
          <h1 className="text-zinc-100 font-semibold">Benchmarks</h1>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 space-y-10 max-w-5xl">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {!loading && !error && (
          <>
            {/* Ingestion History */}
            <section>
              <h2 className="text-zinc-200 font-medium text-sm mb-3">
                Ingestion History
                <span className="text-zinc-600 font-normal ml-2">(last 20 runs)</span>
              </h2>
              {ingestionMetrics.length === 0 ? (
                <p className="text-zinc-600 text-sm">No ingestion runs recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-zinc-400 border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                        <th className="py-2 pr-4 font-medium">Run</th>
                        <th className="py-2 pr-4 font-medium">Total</th>
                        <th className="py-2 pr-4 font-medium">Parse</th>
                        <th className="py-2 pr-4 font-medium">Graph</th>
                        <th className="py-2 pr-4 font-medium">Embed</th>
                        <th className="py-2 pr-4 font-medium">Nodes</th>
                        <th className="py-2 pr-4 font-medium">Chunks</th>
                        <th className="py-2 font-medium">Files ↑/↓/≡</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingestionMetrics.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/40"
                        >
                          <td className="py-2 pr-4 text-zinc-300">{formatDate(m.recordedAt)}</td>
                          <td className="py-2 pr-4">{formatMs(m.totalDurationMs)}</td>
                          <td className="py-2 pr-4">{formatMs(m.parseDurationMs)}</td>
                          <td className="py-2 pr-4">{formatMs(m.graphBuildDurationMs)}</td>
                          <td className="py-2 pr-4">{formatMs(m.embedDurationMs)}</td>
                          <td className="py-2 pr-4">{m.nodeCount.toLocaleString()}</td>
                          <td className="py-2 pr-4">{m.chunkCount.toLocaleString()}</td>
                          <td className="py-2">
                            <span className="text-emerald-400">{m.newFiles}↑</span>
                            {" / "}
                            <span className="text-red-400">{m.deletedFiles}↓</span>
                            {" / "}
                            <span className="text-zinc-600">{m.unchangedFiles}≡</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Copilot Quality */}
            <section>
              <h2 className="text-zinc-200 font-medium text-sm mb-3">
                Copilot Answer Quality
                <span className="text-zinc-600 font-normal ml-2">(last 100 answers)</span>
              </h2>
              {copilotMessages.length === 0 ? (
                <p className="text-zinc-600 text-sm">No copilot answers recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-zinc-400 border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                        <th className="py-2 pr-4 font-medium">Time</th>
                        <th className="py-2 pr-4 font-medium">Duration</th>
                        <th className="py-2 pr-4 font-medium">Rating</th>
                        <th className="py-2 font-medium">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copilotMessages.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/40"
                        >
                          <td className="py-2 pr-4 text-zinc-300 whitespace-nowrap">
                            {formatDate(m.createdAt)}
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            {m.durationMs != null ? formatMs(m.durationMs) : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <RatingBadge rating={m.rating} />
                          </td>
                          <td className="py-2 text-zinc-500 max-w-xs truncate">
                            &ldquo;{m.content.slice(0, 60)}&hellip;&rdquo;
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
