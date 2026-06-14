-- Enable pgvector extension (must run before CREATE TABLE that uses vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "chunkCount" INTEGER,
ADD COLUMN     "indexedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "references" JSONB,
    "intent" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chunk_repositoryId_idx" ON "Chunk"("repositoryId");

-- CreateIndex
CREATE INDEX "Chunk_nodeId_idx" ON "Chunk"("nodeId");

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- IVFFlat index for cosine similarity search on chunks
CREATE INDEX IF NOT EXISTS chunk_embedding_idx
  ON "Chunk" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- NOTE: The IVFFlat index above is created on an empty table at migration time.
-- After the first batch of embeddings is loaded, run:
--   REINDEX INDEX chunk_embedding_idx;
-- to rebuild with proper cluster statistics (pgvector recommends lists ≈ sqrt(row_count)).
