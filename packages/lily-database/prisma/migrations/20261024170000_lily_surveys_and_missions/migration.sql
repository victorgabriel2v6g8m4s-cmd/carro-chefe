CREATE TABLE "LilySurvey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "formJson" TEXT NOT NULL DEFAULT '[]',
    "prerequisitesJson" TEXT NOT NULL DEFAULT '[]',
    "unlocksMissionsJson" TEXT NOT NULL DEFAULT '[]',
    "pointsPerForm" INTEGER NOT NULL DEFAULT 0,
    "pointsPerAnswer" INTEGER NOT NULL DEFAULT 0,
    "showPoints" BOOLEAN NOT NULL DEFAULT false,
    "allowNavigation" BOOLEAN NOT NULL DEFAULT true,
    "mediaMimeTypesJson" TEXT NOT NULL DEFAULT '[]',
    "mediaMaxBytes" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME
);

CREATE TABLE "LilySurveyParticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "surveyVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "LilySurveyParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilySurveyParticipation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "LilySurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LilySurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "surveyVersion" INTEGER NOT NULL,
    "respondentUserId" TEXT,
    "respondentConsented" BOOLEAN NOT NULL DEFAULT false,
    "answersJson" TEXT NOT NULL DEFAULT '{}',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilySurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "LilySurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilySurveyResponse_respondentUserId_fkey" FOREIGN KEY ("respondentUserId") REFERENCES "LilyUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LilyMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "points" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LilySurveyUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilySurveyUpload_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "LilySurveyParticipation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilySurveyUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilySurveyParticipation_userId_surveyId_surveyVersion_key" ON "LilySurveyParticipation"("userId", "surveyId", "surveyVersion");
CREATE INDEX "LilySurvey_status_publishedAt_idx" ON "LilySurvey"("status", "publishedAt");
CREATE INDEX "LilySurveyParticipation_userId_status_completedAt_idx" ON "LilySurveyParticipation"("userId", "status", "completedAt");
CREATE INDEX "LilySurveyParticipation_surveyId_status_startedAt_idx" ON "LilySurveyParticipation"("surveyId", "status", "startedAt");
CREATE INDEX "LilySurveyResponse_surveyId_submittedAt_idx" ON "LilySurveyResponse"("surveyId", "submittedAt");
CREATE INDEX "LilySurveyResponse_respondentUserId_submittedAt_idx" ON "LilySurveyResponse"("respondentUserId", "submittedAt");
CREATE INDEX "LilyMission_status_createdAt_idx" ON "LilyMission"("status", "createdAt");
CREATE UNIQUE INDEX "LilySurveyUpload_storageName_key" ON "LilySurveyUpload"("storageName");
CREATE INDEX "LilySurveyUpload_participationId_questionId_idx" ON "LilySurveyUpload"("participationId", "questionId");
CREATE INDEX "LilySurveyUpload_userId_createdAt_idx" ON "LilySurveyUpload"("userId", "createdAt");
