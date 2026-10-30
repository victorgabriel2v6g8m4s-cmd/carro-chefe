ALTER TABLE "LilyOperationalSettings" ADD COLUMN "activePixProvider" TEXT NOT NULL DEFAULT 'cooklily_pix';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "sicrediPixKeyEncrypted" TEXT;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "sicrediPixMerchantName" TEXT;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "sicrediPixMerchantCity" TEXT;
