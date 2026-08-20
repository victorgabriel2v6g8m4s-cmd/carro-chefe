-- Elimina possíveis duplicatas legadas antes de transformar a idempotência
-- do dispatcher em uma garantia estrutural do banco.
DELETE FROM "WebhookDelivery"
WHERE rowid IN (
  SELECT ranked.rowid
  FROM (
    SELECT
      rowid,
      ROW_NUMBER() OVER (
        PARTITION BY "endpointId", "eventId"
        ORDER BY
          CASE "status" WHEN 'delivered' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END,
          CASE WHEN "responseCode" IS NOT NULL THEN 0 ELSE 1 END,
          "attempt" DESC,
          "deliveredAt" DESC,
          "createdAt" ASC,
          rowid ASC
      ) AS duplicate_rank
    FROM "WebhookDelivery"
  ) AS ranked
  WHERE ranked.duplicate_rank > 1
);

CREATE UNIQUE INDEX "WebhookDelivery_endpointId_eventId_key"
ON "WebhookDelivery"("endpointId", "eventId");
