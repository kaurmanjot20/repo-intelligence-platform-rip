-- CreateTable
CREATE TABLE "IngestionMetric" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "changedFiles" INTEGER NOT NULL DEFAULT 0,
    "newFiles" INTEGER NOT NULL DEFAULT 0,
    "deletedFiles" INTEGER NOT NULL DEFAULT 0,
    "unchangedFiles" INTEGER NOT NULL DEFAULT 0,
    "parseDurationMs" INTEGER NOT NULL,
    "graphBuildDurationMs" INTEGER NOT NULL,
    "embedDurationMs" INTEGER NOT NULL,
    "totalDurationMs" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "nodeCount" INTEGER NOT NULL,
    "edgeCount" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionMetric_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "rating" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "IngestionMetric_jobId_key" ON "IngestionMetric"("jobId");

-- CreateIndex
CREATE INDEX "IngestionMetric_repositoryId_idx" ON "IngestionMetric"("repositoryId");

-- CreateIndex
CREATE INDEX "IngestionMetric_recordedAt_idx" ON "IngestionMetric"("recordedAt");

-- AddForeignKey
ALTER TABLE "IngestionMetric" ADD CONSTRAINT "IngestionMetric_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
