-- P0 segurança: MFA TOTP para contas staff/admin.
-- Segredo TOTP é persistido apenas cifrado; códigos de recuperação ficam somente como hashes.

PRAGMA foreign_keys=ON;

ALTER TABLE "LilyUser" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyUser" ADD COLUMN "mfaSecretEncrypted" TEXT;
ALTER TABLE "LilyUser" ADD COLUMN "mfaRecoveryCodesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyUser" ADD COLUMN "mfaEnrolledAt" DATETIME;
ALTER TABLE "LilySession" ADD COLUMN "mfaVerifiedAt" DATETIME;
