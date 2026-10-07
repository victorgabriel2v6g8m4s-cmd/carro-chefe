-- Escolha pública de pagamento e descontos por método.
-- A tabela é intencionalmente isolada do schema transacional do Carro Chefe.

CREATE TABLE "LilyPaymentMethodSetting" (
  "method" TEXT NOT NULL PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "discountType" TEXT NOT NULL DEFAULT 'none',
  "discountValue" INTEGER NOT NULL DEFAULT 0,
  "maxDiscountCents" INTEGER,
  "minimumOrderCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyPaymentMethodSetting_method_check"
    CHECK ("method" IN ('pix', 'credit_card', 'debit_card')),
  CONSTRAINT "LilyPaymentMethodSetting_discount_type_check"
    CHECK ("discountType" IN ('none', 'percentage', 'fixed')),
  CONSTRAINT "LilyPaymentMethodSetting_discount_value_check"
    CHECK ("discountValue" >= 0),
  CONSTRAINT "LilyPaymentMethodSetting_max_discount_check"
    CHECK ("maxDiscountCents" IS NULL OR "maxDiscountCents" >= 0),
  CONSTRAINT "LilyPaymentMethodSetting_minimum_order_check"
    CHECK ("minimumOrderCents" >= 0)
);

INSERT INTO "LilyPaymentMethodSetting"
  ("method", "enabled", "discountType", "discountValue", "maxDiscountCents", "minimumOrderCents")
VALUES
  ('pix', true, 'none', 0, NULL, 0),
  ('credit_card', true, 'none', 0, NULL, 0),
  ('debit_card', true, 'none', 0, NULL, 0);
