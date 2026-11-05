ALTER TABLE "LilyOperationalSettings"
ADD COLUMN "customerCancellationEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LilyOperationalSettings"
ADD COLUMN "customerCancellationWindowMinutes" INTEGER NOT NULL DEFAULT 15;
