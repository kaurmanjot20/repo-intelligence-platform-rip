-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- CreateIndex
CREATE INDEX "Chunk_repositoryId_nodeId_idx" ON "Chunk"("repositoryId", "nodeId");
