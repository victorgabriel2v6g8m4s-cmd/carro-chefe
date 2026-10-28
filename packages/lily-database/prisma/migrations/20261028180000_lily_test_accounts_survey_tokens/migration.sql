ALTER TABLE "LilyUser" ADD COLUMN "isTestAccount" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LilySurvey" ADD COLUMN "publicToken" TEXT;
UPDATE "LilySurvey"
SET "publicToken" = lower(hex(randomblob(32)))
WHERE "publicToken" IS NULL;
CREATE UNIQUE INDEX "LilySurvey_publicToken_key" ON "LilySurvey"("publicToken");
