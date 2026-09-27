-- Pedidos de homologação não abrem a operação pública e precisam ficar identificáveis no banco.
ALTER TABLE "LilyOrder" ADD COLUMN "isHomologation" BOOLEAN NOT NULL DEFAULT false;
