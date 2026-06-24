# RIP — Project Plan & Status

> Living document. Tracks what is built, what we are doing next, and what remains.
> Last reviewed: 2026-06-24.
>
> Note: the checkboxes in `docs/superpowers/plans/*.md` were never maintained and are
> unreliable. This file is the source of truth for status, derived from the actual code.

---

## ✅ Done

### Phase 1 — Core ingestion & graph (backend)
- Monorepo: Turborepo v2 + pnpm workspaces, package-per-layer architecture.
- `@rip/ingestion`: GitHub clone / ZIP extract, language detection, ingestion service.
- `@rip/parser`: tree-sitter parsers for TypeScript, JavaScript, Python, Java; AST written to disk.
- `@rip/graph-engine`: Neo4j client, NodeMapper, GraphEngine (build) + GraphRepository (query).
- Graph API endpoints: `/graph`, `/graph/summary`, `/graph/nodes`, `/graph/path`.
- `@rip/database`: Prisma schema + repositories (Repository, IngestionJob, ParsedFile, etc.).
- Async ingestion contract: `POST /repositories` → `202 Accepted` + job polling.

### Phase 1 — Frontend (Architecture Explorer)
- React Flow graph explorer (`apps/web/src/components/GraphExplorer.tsx`): pan/zoom, MiniMap,
  Controls, type-filter legend, dynamic import (no SSR crash).
- Repository ingestion form, repository cards, repository detail page, status badges.

### Phase 2 — Repository Copilot
- `@rip/ai-client`: Ollama embedding + LLM providers.
- pgvector chunk storage; `@rip/memory-engine` (chunker, embedder, context builder).
- `@rip/retrieval-engine`: IntentDetector, GraphRetriever, VectorRefiner.
- Copilot API module + `CopilotPanel` / `CopilotCitationChip` UI with citations.

### Phase 3 — Sprint 1: Incremental re-ingestion
- `DiffStrategy` (SHA-256 content hashing), pull-or-clone with stable per-repo paths.
- Targeted re-parse (`parseFiles`), `deleteNodesForFiles`, chunk cleanup, orchestrator rewrite.

### Phase 3 — Sprint 2: BullMQ job pipeline
- `@rip/queue` (BullMQ + ioredis), Redis in docker-compose, `IngestionWorkerService`.
- Queue-based ingestion with retries/backoff, job progress updates, Bull Board dev UI.

### Phase 3 — Sprint 3: PR diff analysis
- `GithubClient` (PR/commit diff fetch), `PrAnalysisService` (graph traversal + LLM summary).
- `PrAnalysisResultRepo`, `getNodesForFiles` / `getCallersOf`, PR analysis modal/panel/button.

### Phase 3 — Sprint 4: Benchmark / evaluation dashboard
- `IngestionMetric` model + repo, metrics written after each job.
- Copilot thumbs rating (`ChatMessage.rating`), benchmarks page + nav link.

### GitHub Integration
- AES-256-GCM crypto util (`@rip/shared-utils/security`), encrypted PAT storage.
- `IRepositoryCredentialResolver` / `PatCredentialResolver`, authenticated git operations.
- Webhook receiver: `WebhookService` (HMAC-SHA256 verify, idempotency via delivery id),
  `WebhookController` with rawBody, `WebhookEvent` lifecycle (PROCESSED/FAILED).
- UI: PAT field + one-time webhook setup panel, sync status badge, tracked-branch display.

---

## 🎯 Next (planned work, in priority order)

1. **Fix fresh-setup blocker — `ENCRYPTION_KEY` in `.env.example`.**
   `crypto.util.ts` reads `ENCRYPTION_KEY` at runtime but it is undocumented. Add it with a
   generation note (`openssl rand -hex 32`). Quick win; unblocks PAT storage on new setups.

2. **Fix `getMessages()` type contract.**
   Add `id` to `IChatRepo.getMessages()` return type (`packages/types/src/memory.ts`) and its
   implementation (`chat.repo.ts`) so the CopilotPanel thumbs-rating buttons have a real id.

3. **Architecture Explorer interactivity (the main feature gap).**
   - Node click → metadata side panel with Imports / Contains / Used By tabs.
   - Node search bar (`useNodeSearch`).
   - Interactive node filter bar (beyond the static legend).
   - Workspace stats on the dashboard / home page.

4. **Webhook commit-hash dedup.**
   In `webhook.service.ts`, early-return (mark SKIPPED) when `payload.after` equals the repo's
   current commit hash, to avoid re-ingesting on pushes with no new commits.

5. **Test coverage for API + frontend.**
   Add service/integration tests for `apps/api` modules (ingestion orchestrator, copilot,
   pr-analysis, benchmark, webhook) and basic web component tests.

---

## ⏳ What's Remaining (full backlog)

### Setup / config
- [x] `ENCRYPTION_KEY` documented in `.env.example` (with `openssl rand -hex 32` note).

### Frontend — Architecture Explorer
- [ ] Metadata side panel (Imports / Contains / Used By) on node click — no `onNodeClick` today.
- [ ] Node search bar.
- [ ] Interactive node filter bar (currently only a static legend).
- [ ] Workspace stats / richer dashboard on home page.
- [ ] (Optional) decomposed routes from the original spec (`/repositories/new`,
      `/repositories/[id]/explore`) — currently consolidated; only do if structure matters.

### GitHub Integration
- [x] Webhook commit-hash dedup (skip re-ingest when pushed commit already ingested).

### Type / contract correctness
- [x] `IChatRepo.getMessages()` now returns `id` (web rating UI relies on it).

### Testing
- [ ] No tests for any `apps/api` module (orchestrator, copilot, pr-analysis, benchmark, webhook).
- [ ] No web / frontend tests.
- [ ] Core package tests exist: ai-client, graph-engine, ingestion, memory-engine, parser,
      retrieval-engine, shared-utils (crypto).

### Known-deferred (from notes.md — intentional, not bugs)
- [ ] Authentication / JWT (currently `local-user` placeholder).
- [ ] Lazy graph loading / drill-down into subtrees for large graphs (>2000 nodes load
      root-level only today).
- [ ] Graph path highlighting in the UI (data available via `/graph/path`, UI not built).
