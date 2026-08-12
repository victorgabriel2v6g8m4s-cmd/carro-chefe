-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN "intentId" TEXT REFERENCES "OperationalIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "AgentLog_runId_sequence_key" ON "AgentLog"("runId", "sequence");
CREATE INDEX "AgentLog_runId_createdAt_idx" ON "AgentLog"("runId", "createdAt");
CREATE INDEX "Upload_intentId_createdAt_idx" ON "Upload"("intentId", "createdAt");
