-- Entrega 07: provider automático Mercado Pago.
-- Defaults continuam fail-closed: provider atual permanece manual e métodos automáticos ficam desabilitados.

PRAGMA foreign_keys=ON;

ALTER TABLE "LilyOperationalSettings" ADD COLUMN "mercadoPagoPixEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "mercadoPagoCardEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyPayment" ADD COLUMN "providerDataJson" TEXT;
