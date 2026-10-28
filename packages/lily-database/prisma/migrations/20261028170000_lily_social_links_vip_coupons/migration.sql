ALTER TABLE "LilyOperationalSettings" ADD COLUMN "socialLinksJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "referralRewardPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LilyCoupon" ADD COLUMN "vipOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "LilyCoupon_vipOnly_status_idx" ON "LilyCoupon"("vipOnly", "status");

UPDATE "LilyOperationalSettings"
SET "instagramHandle" = 'cook._lily',
    "socialLinksJson" = json_array(
      json_object('platform', 'instagram', 'url', 'https://instagram.com/cook._lily', 'identifier', '@cook._lily', 'label', ''),
      json_object(
        'platform', 'whatsapp',
        'url', 'https://wa.me/' || replace(replace(replace(replace(replace("whatsappPhone", '+', ''), ' ', ''), '(', ''), ')', ''), '-', ''),
        'identifier', "whatsappPhone",
        'label', ''
      )
    )
WHERE "id" = 'default';

CREATE TABLE "LilyReferralInvite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT UNIQUE,
  "creditedPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creditedAt" DATETIME,
  CONSTRAINT "LilyReferralInvite_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyReferralInvite_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "LilyUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LilyReferralInvite_referrerUserId_createdAt_idx" ON "LilyReferralInvite"("referrerUserId", "createdAt");
