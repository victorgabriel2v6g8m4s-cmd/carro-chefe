import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoPayment,
  mercadoPagoConfiguration,
  refundMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature
} from "./mercado-pago-provider";

const envSnapshot = {
  nodeEnv: process.env.NODE_ENV,
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
  webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  apiBase: process.env.MERCADO_PAGO_API_BASE_URL
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-ACCESS-TOKEN";
  process.env.MERCADO_PAGO_PUBLIC_KEY = "TEST-PUBLIC-KEY";
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = "webhook-secret-test";
  process.env.MERCADO_PAGO_API_BASE_URL = "https://mercado-pago.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  restore("NODE_ENV", envSnapshot.nodeEnv);
  restore("MERCADO_PAGO_ACCESS_TOKEN", envSnapshot.accessToken);
  restore("MERCADO_PAGO_PUBLIC_KEY", envSnapshot.publicKey);
  restore("MERCADO_PAGO_WEBHOOK_SECRET", envSnapshot.webhookSecret);
  restore("MERCADO_PAGO_API_BASE_URL", envSnapshot.apiBase);
});

describe("Mercado Pago provider CookLily", () => {
  it("cria Pix pela Orders API com idempotência e expõe somente dados públicos do QR", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "order-mp-1",
      status: "action_required",
      status_detail: "waiting_transfer",
      total_amount: "25.00",
      transactions: {
        payments: [{
          id: "payment-mp-1",
          status: "action_required",
          status_detail: "waiting_transfer",
          amount: "25.00",
          payment_method: {
            id: "pix",
            type: "bank_transfer",
            ticket_url: "https://mercado-pago.test/ticket/1",
            qr_code: "000201PIXTESTE",
            qr_code_base64: "aW1hZ2Vt"
          }
        }]
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createMercadoPagoPayment({
      paymentId: "local-payment-1",
      orderId: "order-local-1",
      orderNumber: "CL-TESTE",
      amountCents: 2500,
      currency: "BRL",
      method: "pix",
      idempotencyKey: "cooklily-payment-test-0001",
      payer: { email: "cliente@example.com" }
    });

    expect(result.status).toBe("pending");
    expect(result.providerPaymentId).toBe("order-mp-1");
    expect(result.providerReference).toBe("payment-mp-1");
    expect(result.instructions).toBe("000201PIXTESTE");
    expect(result.providerData?.qrCodeBase64).toBe("aW1hZ2Vt");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mercado-pago.test/v1/orders");
    expect(options.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer TEST-ACCESS-TOKEN",
      "X-Idempotency-Key": "cooklily-payment-test-0001"
    }));
    const body = JSON.parse(String(options.body));
    expect(body.external_reference).toBe("cooklily:order-local-1");
    expect(body.total_amount).toBe("25.00");
    expect(body.transactions.payments[0].payment_method).toEqual(expect.objectContaining({
      id: "pix",
      type: "bank_transfer"
    }));
  });

  it("envia somente token do cartão e reconhece aprovação com valor exato", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "order-card-1",
      status: "processed",
      status_detail: "accredited",
      total_amount: "31.90",
      transactions: {
        payments: [{
          id: "payment-card-1",
          status: "processed",
          status_detail: "accredited",
          amount: "31.90",
          paid_amount: "31.90",
          payment_method: {
            id: "master",
            type: "credit_card",
            installments: 2
          }
        }]
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createMercadoPagoPayment({
      paymentId: "local-card-1",
      orderId: "order-local-card-1",
      orderNumber: "CL-CARD",
      amountCents: 3190,
      currency: "BRL",
      method: "credit_card",
      idempotencyKey: "cooklily-card-test-0001",
      payer: {
        email: "cliente@example.com",
        identification: { type: "CPF", number: "12345678901" }
      },
      card: {
        token: "one-time-card-token-generated-by-brick",
        paymentMethodId: "master",
        installments: 2
      }
    });

    expect(result.status).toBe("approved");
    expect(result.paidCents).toBe(3190);

    const options = fetchMock.mock.calls[0]![1] as RequestInit;
    const bodyText = String(options.body);
    const body = JSON.parse(bodyText);
    expect(body.transactions.payments[0].payment_method.token).toBe("one-time-card-token-generated-by-brick");
    expect(body.transactions.payments[0].payment_method.installments).toBe(2);
    expect(bodyText).not.toMatch(/card_number|security_code|cvv/i);
  });

  it("valida assinatura HMAC do webhook e não aceita assinatura alterada", () => {
    const dataId = "ORDER-ABC";
    const requestId = "request-123";
    const ts = "1790546000";
    const template = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const digest = crypto.createHmac("sha256", "webhook-secret-test").update(template).digest("hex");

    expect(verifyMercadoPagoWebhookSignature({
      dataId,
      requestId,
      signature: `ts=${ts},v1=${digest}`
    })).toBe(true);

    expect(verifyMercadoPagoWebhookSignature({
      dataId,
      requestId,
      signature: `ts=${ts},v1=${"0".repeat(64)}`
    })).toBe(false);
  });

  it("faz estorno parcial pela Orders API e conserva a referência da operação", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "order-refund-1",
      status: "processed",
      status_detail: "partially_refunded",
      total_amount: "25.00",
      transactions: {
        payments: [{
          id: "payment-refund-1",
          status: "processed",
          status_detail: "partially_refunded",
          amount: "25.00",
          paid_amount: "25.00"
        }],
        refunds: [{
          id: "refund-operation-1",
          transaction_id: "payment-refund-1",
          amount: "5.00",
          status: "processed"
        }]
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await refundMercadoPagoPayment({
      providerPaymentId: "order-refund-1",
      providerReference: "payment-refund-1",
      amountCents: 500,
      remainingCents: 2500,
      idempotencyKey: "cooklily-refund-test-0001"
    });

    expect(result.status).toBe("partially_refunded");
    expect(result.refundedCents).toBe(500);
    expect(result.operationReference).toBe("refund-operation-1");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mercado-pago.test/v1/orders/order-refund-1/refund");
    expect(JSON.parse(String(options.body))).toEqual({
      transactions: [{ id: "payment-refund-1", amount: "5.00" }]
    });
  });

  it("mantém readiness separado para Pix e cartão sem expor segredos", () => {
    const configuration = mercadoPagoConfiguration();
    expect(configuration).toEqual({
      accessTokenConfigured: true,
      publicKey: "TEST-PUBLIC-KEY",
      webhookSecretConfigured: true,
      pixReady: true,
      cardReady: true
    });
    expect(JSON.stringify(configuration)).not.toContain("TEST-ACCESS-TOKEN");
    expect(JSON.stringify(configuration)).not.toContain("webhook-secret-test");
  });
});
