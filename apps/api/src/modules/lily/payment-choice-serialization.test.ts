import { describe, expect, it } from "vitest";
import { serializeLilyChoicePayment } from "./payment-choice-serialization";

describe("snapshot financeiro do pagamento por método", () => {
  it("recupera a regra append-only quando sincronização do provider substitui providerDataJson", () => {
    const orchestration = {
      version: 1,
      selectedMethod: "pix",
      baseAmountCents: 3000,
      eligibleAmountCents: 2500,
      deliveryFeeCents: 500,
      discountCents: 250,
      amountCents: 2750,
      rule: {
        method: "pix",
        enabled: true,
        discountType: "percentage",
        discountValue: 1000,
        maxDiscountCents: null,
        minimumOrderCents: 0
      },
      fallbackChain: ["cooklily_pix", "mercado_pago", "manual"],
      attemptedProviders: ["cooklily_pix"],
      actualProvider: "cooklily_pix"
    };
    const payment = {
      id: "payment-1",
      orderId: "order-1",
      order: { orderNumber: "CL-1" },
      provider: "cooklily_pix",
      method: "pix",
      status: "pending",
      amountCents: 2750,
      currency: "BRL",
      instructionsSnapshot: "pix-code",
      // Simula o sincronizador legado sobrescrevendo metadados mutáveis do provider.
      providerDataJson: JSON.stringify({ providerStatus: "pending" }),
      events: [{
        eventType: "payment.created",
        payloadJson: JSON.stringify({ orchestration }),
        createdAt: new Date("2026-10-05T18:00:00-03:00")
      }],
      expiresAt: null,
      approvedAt: null,
      failedAt: null,
      createdAt: new Date("2026-10-05T18:00:00-03:00"),
      updatedAt: new Date("2026-10-05T18:01:00-03:00")
    };

    const serialized = serializeLilyChoicePayment(payment);
    expect(serialized.pricing.baseAmountCents).toBe(3000);
    expect(serialized.pricing.deliveryFeeCents).toBe(500);
    expect(serialized.pricing.discountCents).toBe(250);
    expect(serialized.pricing.amountCents).toBe(2750);
    expect(serialized.pricing.rule?.discountValue).toBe(1000);
    expect(serialized.routing.fallbackChain).toEqual(["cooklily_pix", "mercado_pago", "manual"]);
  });
});
