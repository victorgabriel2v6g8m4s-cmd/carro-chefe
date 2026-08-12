CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT,
    "runId" TEXT,
    "actor" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Upload_storageName_key" ON "Upload"("storageName");
CREATE INDEX "Upload_taskId_createdAt_idx" ON "Upload"("taskId", "createdAt");
CREATE INDEX "Upload_runId_createdAt_idx" ON "Upload"("runId", "createdAt");
