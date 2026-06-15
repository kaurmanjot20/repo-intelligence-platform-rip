-- CreateTable
CREATE TABLE "PrAnalysisResult" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "prUrl" TEXT,
    "baseSha" TEXT,
    "headSha" TEXT,
    "changedFiles" TEXT[],
    "summary" TEXT NOT NULL,
    "impactedNodes" JSONB NOT NULL,
    "references" JSONB NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrAnalysisResult_repositoryId_idx" ON "PrAnalysisResult"("repositoryId");

-- AddForeignKey
ALTER TABLE "PrAnalysisResult" ADD CONSTRAINT "PrAnalysisResult_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
