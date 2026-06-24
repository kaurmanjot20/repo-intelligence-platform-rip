# RIP — Repository Intelligence Platform

Ingest any GitHub repository into a **Neo4j knowledge graph** and explore it visually,
ask natural-language questions about the codebase with an **LLM Copilot**, and run
**graph-aware PR impact analysis** that traces changed files through call and import
edges. GitHub webhooks keep the graph continuously in sync on every push.

**Stack:** TypeScript · NestJS · Next.js 15 · Neo4j · PostgreSQL (pgvector) · BullMQ/Redis · Ollama · Turborepo

---

## Features

- **Code graph** — parses TS/JS, Python, and Java with tree-sitter and builds a graph of
  files, classes, functions, imports, and calls in Neo4j.
- **Architecture Explorer** — interactive React Flow graph with a force-directed layout
  that spreads nodes into draggable clusters, hover-to-focus highlighting, node search,
  type filtering, a metadata side panel (Imports / Contains / Used By), shortest-path
  highlighting, and lazy drill-down for large graphs (>2000 nodes).
- **Copilot** — retrieval-augmented Q&A over the codebase (graph traversal + pgvector
  semantic search + LLM), with citations and thumbs rating.
- **PR impact analysis** — give a PR or commit range and see the 1- and 2-hop blast
  radius of the change, with an LLM summary.
- **GitHub integration** — per-repo push webhooks (HMAC-SHA256 verified, idempotent),
  AES-256-GCM encrypted PAT storage, and automatic incremental re-ingestion.
- **Benchmark dashboard** — ingestion metrics and Copilot answer ratings per repository.

---

## Architecture

A pnpm + Turborepo monorepo with a strict dependency direction
(`@rip/types → @rip/shared-utils → [feature packages] → apps`).

```
apps/
  api/          NestJS API (REST, BullMQ worker, webhooks)
  web/          Next.js 15 frontend (App Router)
packages/
  types/        Shared domain types & interfaces
  shared-utils/ Logger, errors, AES-256-GCM crypto
  ingestion/    Clone/extract, language detection, diff strategy
  parser/       tree-sitter parsers (TS/JS/Python/Java)
  graph-engine/ Neo4j build (GraphEngine) + query (GraphRepository)
  database/     Prisma schema + repositories (PostgreSQL)
  memory-engine/ Chunking + embedding for semantic search
  retrieval-engine/ Intent detection, graph + vector retrieval
  ai-client/    Ollama embedding & LLM providers
  queue/        BullMQ ingestion queue
docker/         docker-compose for Postgres, Neo4j, Redis (+ Ollama)
```

**Data stores:** Neo4j owns the code graph; PostgreSQL owns everything else
(repositories, jobs, chunks/embeddings, chat, metrics); Redis backs the job queue.

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** 9.4 (`corepack enable` then `corepack prepare pnpm@9.4.0 --activate`)
- **Docker** + Docker Compose (for Postgres, Neo4j, Redis)
- **Ollama** — required only for the Copilot / semantic search (optional otherwise).
  GPU recommended. You can run it natively or via `docker/docker-compose.ai.yml` (needs an NVIDIA GPU).

---

## Quick start

### 1. Install dependencies

```bash
git clone https://github.com/kaurmanjot20/repo-intelligence-platform-rip.git
cd repo-intelligence-platform-rip
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then set a 64-char encryption key (used to encrypt stored GitHub PATs):

```bash
# prints a value to paste into ENCRYPTION_KEY in .env
openssl rand -hex 32
```

See the [Environment variables](#environment-variables) table for the full list.
Defaults match the Docker Compose services, so you usually only need to set
`ENCRYPTION_KEY`.

### 3. Start the infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

This brings up Postgres (pgvector), Neo4j (with APOC), and Redis.

### 4. Set up the database

```bash
pnpm --filter @rip/database generate        # generate Prisma client
pnpm --filter @rip/database migrate:deploy   # apply migrations
pnpm --filter @rip/database seed             # create local-workspace + local-user
```

> The frontend uses the seeded `local-workspace`, so the seed step is required.
> Prisma reads `DATABASE_URL` from the environment — make sure your `.env` is loaded
> (or copy it into `packages/database/`).

### 5. (Copilot only) Start Ollama and pull models

```bash
ollama serve                       # if not already running
ollama pull qwen2.5-coder          # LLM (OLLAMA_LLM_MODEL)
ollama pull nomic-embed-text       # embeddings
```

Or via Docker (NVIDIA GPU required):

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.ai.yml up -d
```

### 6. Build and run

```bash
pnpm build      # build all packages (apps import from package dist/)
pnpm dev        # run API + web + package watchers via Turborepo
```

| Service        | URL                              |
| -------------- | -------------------------------- |
| Web app        | http://localhost:3000            |
| API            | http://localhost:3001/api/v1     |
| Bull Board (dev) | http://localhost:3001/admin/queues |
| Neo4j Browser  | http://localhost:7474 (neo4j / rippassword) |

Open **http://localhost:3000**, paste a GitHub repo URL, and watch it ingest.

---

## Environment variables

| Variable              | Default                              | Description                                  |
| --------------------- | ------------------------------------ | -------------------------------------------- |
| `DATABASE_URL`        | `postgresql://rip:rip@localhost:5432/rip` | PostgreSQL connection string            |
| `NEO4J_URI`           | `bolt://localhost:7687`              | Neo4j bolt URI                               |
| `NEO4J_USER`          | `neo4j`                              | Neo4j user                                   |
| `NEO4J_PASSWORD`      | `rippassword`                        | Neo4j password                               |
| `DATA_DIR`            | `./data/repositories`                | Where cloned repos + AST JSON are stored     |
| `PORT`                | `3001`                               | API port                                     |
| `CORS_ORIGIN`         | `http://localhost:3000`              | Allowed frontend origin                      |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1`       | API base URL used by the frontend            |
| `OLLAMA_BASE_URL`     | `http://localhost:11434`             | Ollama endpoint                              |
| `OLLAMA_LLM_MODEL`    | `qwen2.5-coder`                      | Copilot LLM model                            |
| `REDIS_HOST`          | `localhost`                          | Redis host (BullMQ)                          |
| `REDIS_PORT`          | `6379`                               | Redis port                                   |
| `GITHUB_TOKEN`        | _(empty)_                            | Optional fallback token for cloning          |
| `ENCRYPTION_KEY`      | _(required)_                         | 64 hex chars; AES-256-GCM key for stored PATs |

---

## Usage

1. **Ingest a repository** — on the dashboard, paste a GitHub URL (and an optional PAT
   for private repos). Ingestion runs asynchronously; the status updates live.
2. **Explore** — open a repository to browse its graph. Click a node for metadata and
   relationships, search/filter by type, mark two nodes to highlight the path between
   them, and double-click to expand subtrees on large graphs.
3. **Copilot** — open the Copilot panel and ask questions like *"where is auth handled?"*
   Answers cite the relevant graph nodes (requires Ollama).
4. **Analyze a PR** — click **Analyze PR**, paste a PR URL or commit range, and review the
   impacted nodes and summary.
5. **Benchmarks** — view ingestion metrics and Copilot ratings for a repository.

### Enabling automatic sync (webhooks)

When you ingest with a PAT, the API returns a **webhook secret** and the UI shows a
one-time setup panel. In your GitHub repo:

- **Settings → Webhooks → Add webhook**
- Payload URL: `https://<your-api-host>/api/v1/repositories/<id>/webhook`
- Content type: `application/json`
- Secret: the value shown in the setup panel
- Events: **Just the push event**

Pushes to the tracked branch then trigger incremental re-ingestion automatically.
(For local development, expose the API with a tunnel such as ngrok so GitHub can reach it.)

---

## Scripts

Run from the repo root (Turborepo fans out to all packages):

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm build`       | Build all packages and apps              |
| `pnpm dev`         | Run API + web + watchers                 |
| `pnpm test`        | Run the test suite                       |
| `pnpm typecheck`   | Type-check everything                    |
| `pnpm lint`        | Lint everything                          |
| `pnpm clean`       | Clean build output and `node_modules`    |

Database (run with `pnpm --filter @rip/database <script>`): `generate`, `migrate:dev`,
`migrate:deploy`, `seed`.

---

## Testing

```bash
pnpm test
```

Unit tests cover the parser, language detection, diff strategy, node mapper, chunker,
intent detector, crypto util, and the webhook service. Run a single package with
`pnpm --filter @rip/<pkg> test`.

---

## Troubleshooting

- **`ENCRYPTION_KEY must be exactly 64 hex characters`** — set `ENCRYPTION_KEY` in `.env`
  to the output of `openssl rand -hex 32`.
- **Prisma can't find `DATABASE_URL`** — ensure `.env` is loaded in the shell, or copy it
  into `packages/database/`.
- **Copilot / indexing errors** — Ollama isn't running or the models aren't pulled. Start
  `ollama serve` and pull `qwen2.5-coder` + `nomic-embed-text`.
- **Apps can't resolve `@rip/*`** — run `pnpm build` once before `pnpm dev`; apps import
  from each package's compiled `dist/`.
- **Neo4j connection refused** — the container needs a few seconds to become healthy after
  `docker compose up`; check `docker compose -f docker/docker-compose.yml ps`.

---

## License

[MIT](./LICENSE) © Manjot Kaur
