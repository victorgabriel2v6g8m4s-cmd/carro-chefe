ALTER TABLE "LilySurveyParticipation" ADD COLUMN "questionTimesJson" TEXT NOT NULL DEFAULT '{}';

CREATE TABLE "LilySurveyView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilySurveyView_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "LilySurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LilySurveyQuestionMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "surveyVersion" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "timeTotalMs" REAL NOT NULL DEFAULT 0,
    "timeSamples" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LilySurveyQuestionMetric_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "LilySurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilySurveyView_surveyId_viewId_key" ON "LilySurveyView"("surveyId", "viewId");
CREATE INDEX "LilySurveyView_surveyId_viewedAt_idx" ON "LilySurveyView"("surveyId", "viewedAt");
CREATE UNIQUE INDEX "LilySurveyQuestionMetric_surveyId_surveyVersion_questionId_optionKey_key" ON "LilySurveyQuestionMetric"("surveyId", "surveyVersion", "questionId", "optionKey");
CREATE INDEX "LilySurveyQuestionMetric_surveyId_surveyVersion_questionId_idx" ON "LilySurveyQuestionMetric"("surveyId", "surveyVersion", "questionId");
