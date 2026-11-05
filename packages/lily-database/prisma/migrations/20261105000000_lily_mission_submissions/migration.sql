CREATE TABLE "LilyMissionSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "missionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "periodKey" TEXT NOT NULL,
  "username" TEXT,
  "evidenceText" TEXT,
  "storageName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "reviewNote" TEXT,
  "reviewedByUserId" TEXT,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  CONSTRAINT "LilyMissionSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "LilyMission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyMissionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyMissionSubmission_status_submittedAt_idx" ON "LilyMissionSubmission"("status", "submittedAt");
CREATE INDEX "LilyMissionSubmission_userId_missionId_periodKey_status_idx" ON "LilyMissionSubmission"("userId", "missionId", "periodKey", "status");
CREATE INDEX "LilyMissionSubmission_missionId_submittedAt_idx" ON "LilyMissionSubmission"("missionId", "submittedAt");
