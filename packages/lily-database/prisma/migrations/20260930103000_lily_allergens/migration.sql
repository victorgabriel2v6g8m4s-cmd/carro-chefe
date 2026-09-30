-- Entrega 12 — alergênicos estruturados e snapshot do pedido.
--
-- Campos começam como unreviewed para impedir que ausência de cadastro seja
-- interpretada como ausência de alergênicos.

ALTER TABLE "LilyProduct" ADD COLUMN "allergenReviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "LilyProduct" ADD COLUMN "allergenContainsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyProduct" ADD COLUMN "allergenMayContainJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "LilyFlavorComponent" ADD COLUMN "allergenReviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "LilyFlavorComponent" ADD COLUMN "allergenContainsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyFlavorComponent" ADD COLUMN "allergenMayContainJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "LilyAddon" ADD COLUMN "allergenReviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "LilyAddon" ADD COLUMN "allergenContainsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LilyAddon" ADD COLUMN "allergenMayContainJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "LilyOrderItem" ADD COLUMN "allergenSnapshotJson" TEXT NOT NULL DEFAULT '{"complete":false,"contains":[],"mayContain":[],"unreviewed":[]}';
