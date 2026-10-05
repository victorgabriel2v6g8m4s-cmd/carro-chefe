import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { configureLilySqlite, lilyPrisma } from "@lily-acai/database";
import { createLilyPixChoice } from "./payment-choice-routing";

beforeAll(async () => {
  await configureLilySqlite();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  delete process.env.MERCADO_PAGO_API_BASE_URL;
});

const quote = {
  method: "pix" as const,
  baseAmountCents: 2000,
  eligibleAmountCents: 2000,
  deliveryFeeCents: 0,
  discountCents: 0,
  amountCents: 2000,
  rule: {
    method: "pix" as const,
    enabled: true,
    discountType: "none" as const,
    discountValue: 0,
    maxDiscountCents: null,
    minimumOrderCents: 0
  }
};

describe("fallback Pix Mercado Pago", () => {
  it("cai para Pix manual depois de recusa determinística do Mercado Pago", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-access";
    process.env.MERCADO_PAGO_API_BASE_URL = "http://mercado-pago.test";
    await lilyPrisma.lilyOperationalSettings.upsert({
      where: { id: "default" },
      create: { id: "default", manualPixEnabled: true, manualPixInstructions: "PIX MANUAL CONTINGÊNCIA" },
      update: { manualPixEnabled: true, manualPixInstructions: "PIX MANUAL CONTINGÊNCIA" }
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "rejected" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    })));

    const created = await createLilyPixChoice({
      paymentId: "payment-fallback-1",
      order: { id: "order-fallback-1", orderNumber: "CL-FALLBACK-1" },
      request: { payer: { email: "cliente@example.com" } },
      quote,
      idempotencyKey: "payment-fallback-idempotency-0001",
      chain: ["mercado_pago", "manual"]
    });

    expect(created.provider).toBe("manual");
    expect(created.attemptedProviders).toEqual(["mercado_pago", "manual"]);
    expect(created.result.instructions).toBe("PIX MANUAL CONTINGÊNCIA");
  });

  it("não cria fallback manual quando a tentativa no Mercado Pago fica ambígua", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-access";
    process.env.MERCADO_PAGO_API_BASE_URL = "http://mercado-pago.test";
    await lilyPrisma.lilyOperationalSettings.upsert({
      where: { id: "default" },
      create: { id: "default", manualPixEnabled: true, manualPixInstructions: "PIX MANUAL CONTINGÊNCIA" },
      update: { manualPixEnabled: true, manualPixInstructions: "PIX MANUAL CONTINGÊNCIA" }
    });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));

    await expect(createLilyPixChoice({
      paymentId: "payment-fallback-2",
      order: { id: "order-fallback-2", orderNumber: "CL-FALLBACK-2" },
      request: { payer: { email: "cliente@example.com" } },
      quote,
      idempotencyKey: "payment-fallback-idempotency-0002",
      chain: ["mercado_pago", "manual"]
    })).rejects.toMatchObject({
      statusCode: 502,
      details: { code: "LILY_PAYMENT_PROVIDER_UNCERTAIN", provider: "mercado_pago" }
    });
  });
});
