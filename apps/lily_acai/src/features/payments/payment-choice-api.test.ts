import { afterEach, describe, expect, it, vi } from "vitest";
import { createLilyPaymentChoice, LilyPaymentChoiceRequestError } from "./payment-choice-api";

describe("payment choice request errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves a definitive provider rejection code and request reference", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "O Mercado Pago recusou a tentativa de cartão.",
      details: { code: "LILY_PAYMENT_PROVIDER_REJECTED" },
      requestId: "req-test"
    }), { status: 502, headers: { "content-type": "application/json" } })));

    await expect(createLilyPaymentChoice({
      orderId: "order-test",
      method: "credit_card",
      idempotencyKey: "key-test"
    })).rejects.toMatchObject({
      name: "LilyPaymentChoiceRequestError",
      code: "LILY_PAYMENT_PROVIDER_REJECTED",
      message: "O Mercado Pago recusou a tentativa de cartão. (referência req-test)"
    } satisfies Partial<LilyPaymentChoiceRequestError>);
  });

  it("does not classify an ambiguous upstream failure as a definitive rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "O pagamento ainda não foi confirmado.",
      details: { code: "LILY_PAYMENT_PROVIDER_UNCERTAIN" },
      requestId: "req-uncertain"
    }), { status: 502, headers: { "content-type": "application/json" } })));

    await expect(createLilyPaymentChoice({
      orderId: "order-test",
      method: "credit_card",
      idempotencyKey: "key-test"
    })).rejects.toMatchObject({ code: "LILY_PAYMENT_PROVIDER_UNCERTAIN" });
  });
});
