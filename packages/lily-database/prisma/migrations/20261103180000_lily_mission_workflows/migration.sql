ALTER TABLE "LilyMission" ADD COLUMN "stepsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyMission" ADD COLUMN "productRewardsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyMission" ADD COLUMN "audienceJson" TEXT NOT NULL DEFAULT '{"operator":"AND","rules":[{"type":"category","value":"all"}]}';
ALTER TABLE "LilyMission" ADD COLUMN "completionMode" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "LilyMission" ADD COLUMN "completionCriteriaJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "LilyMission" ADD COLUMN "evidenceRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyMission" ADD COLUMN "usernameRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyMission" ADD COLUMN "reviewWindowHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "LilyMission" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "LilyMission" ADD COLUMN "createdByUserId" TEXT;

CREATE TABLE "LilyMissionMediaLink" (
    "missionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "LilyMissionMediaLink_pkey" PRIMARY KEY ("missionId", "mediaId"),
    CONSTRAINT "LilyMissionMediaLink_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "LilyMission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyMissionMediaLink_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "LilyMediaAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LilyMissionMediaLink_mediaId_idx" ON "LilyMissionMediaLink"("mediaId");

CREATE TABLE "LilyMissionAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "completedStepsJson" TEXT NOT NULL DEFAULT '[]',
    "submissionUsername" TEXT,
    "submissionNote" TEXT,
    "reviewNote" TEXT,
    "submittedAt" DATETIME,
    "reviewDueAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewerUserId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LilyMissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "LilyMission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyMissionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyMissionAssignment_missionId_userId_key" ON "LilyMissionAssignment"("missionId", "userId");
CREATE INDEX "LilyMissionAssignment_userId_status_createdAt_idx" ON "LilyMissionAssignment"("userId", "status", "createdAt");
CREATE INDEX "LilyMissionAssignment_missionId_status_submittedAt_idx" ON "LilyMissionAssignment"("missionId", "status", "submittedAt");

CREATE TABLE "LilyMissionEvidenceUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilyMissionEvidenceUpload_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LilyMissionAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyMissionEvidenceUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyMissionEvidenceUpload_storageName_key" ON "LilyMissionEvidenceUpload"("storageName");
CREATE INDEX "LilyMissionEvidenceUpload_assignmentId_createdAt_idx" ON "LilyMissionEvidenceUpload"("assignmentId", "createdAt");
CREATE INDEX "LilyMissionEvidenceUpload_userId_createdAt_idx" ON "LilyMissionEvidenceUpload"("userId", "createdAt");

CREATE TABLE "LilyMissionProductEntitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "redemptionCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "redeemedAt" DATETIME,
    "fulfilledBy" TEXT,
    "fulfilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilyMissionProductEntitlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LilyMissionAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyMissionProductEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyMissionProductEntitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyMissionProductEntitlement_redemptionCode_key" ON "LilyMissionProductEntitlement"("redemptionCode");
CREATE UNIQUE INDEX "LilyMissionProductEntitlement_assignmentId_productId_key" ON "LilyMissionProductEntitlement"("assignmentId", "productId");
CREATE INDEX "LilyMissionProductEntitlement_userId_status_createdAt_idx" ON "LilyMissionProductEntitlement"("userId", "status", "createdAt");
