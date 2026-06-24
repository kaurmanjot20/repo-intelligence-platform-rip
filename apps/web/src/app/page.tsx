"use client"
import { IngestionForm } from "../components/IngestionForm"
import { RepositoryCard } from "../components/RepositoryCard"
import { WorkspaceStats } from "../components/WorkspaceStats"
import { useRepositories } from "../hooks/useRepositories"

export default function DashboardPage() {
  const { repos, loading, error, createRepo, removeRepo } = useRepositories()

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Repository Intelligence Platform</h1>
        <p className="text-zinc-400 mt-1 text-sm">Ingest a GitHub repository to explore its architecture graph.</p>
      </div>

      {!loading && !error && <WorkspaceStats repos={repos} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Ingest Repository</h2>
        <IngestionForm onSubmit={createRepo} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Repositories {!loading && `(${repos.length})`}
        </h2>

        {loading && (
          <p className="text-zinc-500 text-sm">Loading…</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">Failed to load repositories: {error}</p>
        )}
        {!loading && !error && repos.length === 0 && (
          <p className="text-zinc-600 text-sm">No repositories yet. Ingest one above.</p>
        )}
        <div className="flex flex-col gap-3">
          {repos.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} onDelete={removeRepo} />
          ))}
        </div>
      </section>
    </main>
  )
}
