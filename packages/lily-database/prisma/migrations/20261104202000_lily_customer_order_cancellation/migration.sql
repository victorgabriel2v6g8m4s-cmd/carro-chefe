ALTER TABLE "LilyOrder"
ADD COLUMN "customerCancellationStatus" TEXT NOT NULL DEFAULT 'not_requested';

ALTER TABLE "LilyOrder"
ADD COLUMN "customerCancellationRequestedAt" DATETIME;
