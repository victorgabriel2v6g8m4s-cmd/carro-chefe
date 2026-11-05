import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoPayment,
  mercadoPagoConfiguration,
  refundMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature
} from "./mercado-pago-provider";
import { createMercadoPagoChoicePayment } from "./mercado-pago-choice-provider";

const envSnapshot = {
  nodeEnv: process.env.NODE_ENV,
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
  webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  apiBase: process.env.MERCADO_PAGO_API_BASE_URL,
  environment: process.env.MERCADO_PAGO_ENVIRONMENT,
  accessTokenTest: process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST,
  publicKeyTest: process.env.MERCADO_PAGO_PUBLIC_KEY_TEST,
  webhookSecretTest: process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST
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
  delete process.env.MERCADO_PAGO_ENVIRONMENT;
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;
  delete process.env.MERCADO_PAGO_PUBLIC_KEY_TEST;
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST;
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
  restore("MERCADO_PAGO_ENVIRONMENT", envSnapshot.environment);
  restore("MERCADO_PAGO_ACCESS_TOKEN_TEST", envSnapshot.accessTokenTest);
  restore("MERCADO_PAGO_PUBLIC_KEY_TEST", envSnapshot.publicKeyTest);
  restore("MERCADO_PAGO_WEBHOOK_SECRET_TEST", envSnapshot.webhookSecretTest);
});

describe("Mercado Pago provider CookLily", () => {
  it("seleciona exclusivamente credenciais _TEST quando o modo test está explícito", async () => {
    process.env.MERCADO_PAGO_ENVIRONMENT = "test";
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "PRODUCTION-TOKEN-MUST-NOT-BE-USED";
    process.env.MERCADO_PAGO_PUBLIC_KEY = "PRODUCTION-KEY-MUST-NOT-BE-USED";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "PRODUCTION-SECRET-MUST-NOT-BE-USED";
    process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST = "TEST-ACCESS-TOKEN";
    process.env.MERCADO_PAGO_PUBLIC_KEY_TEST = "TEST-PUBLIC-KEY";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET_TEST = "test-webhook-secret";

    expect(mercadoPagoConfiguration()).toEqual({
      accessTokenConfigured: true,
      publicKey: "TEST-PUBLIC-KEY",
      webhookSecretConfigured: true,
      pixReady: true,
      cardReady: true
    });

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "test-order" }));
    vi.stubGlobal("fetch", fetchMock);
    await createMercadoPagoPayment({
      paymentId: "payment-test-mode",
      orderId: "order-test-mode",
      orderNumber: "CL-TEST-MODE",
      amountCents: 1000,
      currency: "BRL",
      method: "pix",
      idempotencyKey: "test-mode-credential-isolation",
      payer: { email: "cliente@example.com" }
    });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual(expect.objectContaining({ Authorization: "Bearer TEST-ACCESS-TOKEN" }));
  });

  it("não reaproveita credenciais de produção quando faltam as credenciais _TEST", async () => {
    process.env.MERCADO_PAGO_ENVIRONMENT = "test";
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "PRODUCTION-TOKEN-MUST-NOT-BE-USED";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "PRODUCTION-SECRET-MUST-NOT-BE-USED";
    expect(mercadoPagoConfiguration()).toEqual({
      accessTokenConfigured: false,
      publicKey: null,
      webhookSecretConfigured: false,
      pixReady: false,
      cardReady: false
    });
    await expect(createMercadoPagoPayment({
      paymentId: "payment-no-test-token",
      orderId: "order-no-test-token",
      orderNumber: "CL-NO-TEST-TOKEN",
      amountCents: 1000,
      currency: "BRL",
      method: "pix",
      idempotencyKey: "no-test-token-no-fallback",
      payer: { email: "cliente@example.com" }
    })).rejects.toMatchObject({
      statusCode: 503,
      details: { code: "LILY_MERCADO_PAGO_NOT_CONFIGURED" }
    });
  });

  it("usa a credencial _TEST também no fluxo de escolha de pagamento", async () => {
    process.env.MERCADO_PAGO_ENVIRONMENT = "test";
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "PRODUCTION-TOKEN-MUST-NOT-BE-USED";
    process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST = "TEST-ACCESS-TOKEN";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "choice-test-order",
      transactions: { payments: [{ id: "choice-payment", status: "action_required" }] }
    }));
    vi.stubGlobal("fetch", fetchMock);

    await createMercadoPagoChoicePayment({
      paymentId: "choice-test-payment",
      orderId: "choice-test-local-order",
      amountCents: 1000,
      method: "pix",
      idempotencyKey: "choice-test-credential-isolation",
      payer: { email: "cliente@example.com" }
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual(expect.objectContaining({ Authorization: "Bearer TEST-ACCESS-TOKEN" }));
  });

  it("retorna apenas metadados allowlist quando a Orders API recusa uma tentativa", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "DETAILS MUST NOT LEAK",
      cause: [{ code: "CARD_TOKEN_INVALID", description: "private detail must not leak" }]
    }), { status: 400, headers: { "Content-Type": "application/json", "x-request-id": "mp-req_123" } }));
    vi.stubGlobal("fetch", fetchMock);

    const attempt = createMercadoPagoChoicePayment({
      paymentId: "choice-rejected-test",
      orderId: "choice-rejected-order",
      amountCents: 1000,
      method: "pix",
      idempotencyKey: "choice-rejected-idempotency",
      payer: { email: "cliente@example.com" }
    });

    await expect(attempt).rejects.toMatchObject({
      statusCode: 502,
      message: "O Mercado Pago recusou a tentativa de cartão. Confira os dados ou escolha outro meio de pagamento.",
      details: {
        code: "LILY_PAYMENT_PROVIDER_REJECTED",
        provider: "mercado_pago",
        providerStatus: 400,
        providerRequestId: "mp-req_123",
        providerCauseCodes: ["CARD_TOKEN_INVALID"]
      }
    });
    await expect(attempt).rejects.not.toThrow(/private detail|DETAILS MUST NOT LEAK/);
  });

  it("classifica erro HTTP 5xx do provedor como resultado ambíguo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "service_unavailable" }), {
      status: 503, headers: { "Content-Type": "application/json" }
    })));
    await expect(createMercadoPagoChoicePayment({
      paymentId: "choice-ambiguous-test",
      orderId: "choice-ambiguous-order",
      amountCents: 1000,
      method: "pix",
      idempotencyKey: "choice-ambiguous-idempotency",
      payer: { email: "cliente@example.com" }
    })).rejects.toMatchObject({
      statusCode: 502,
      details: { code: "LILY_PAYMENT_PROVIDER_UNCERTAIN", providerStatus: 503, providerFailure: "upstream" }
    });
  });

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

  it("confirma estorno total pela resposta autoritativa e mantém a mesma chave idempotente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "order-full-refund",
      status: "refunded",
      status_detail: "refunded",
      total_amount: "25.00",
      transactions: {
        payments: [{ id: "payment-full-refund", status: "processed", amount: "25.00", paid_amount: "25.00" }],
        refunds: [{ id: "refund-full-1", transaction_id: "payment-full-refund", amount: "25.00" }]
      }
    }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const result = await refundMercadoPagoPayment({
      providerPaymentId: "order-full-refund",
      providerReference: "payment-full-refund",
      amountCents: 2500,
      remainingCents: 2500,
      idempotencyKey: "cooklily-customer-cancel-order-full-refund"
    });

    expect(result).toMatchObject({ status: "refunded", refundedCents: 2500, operationReference: "refund-full-1" });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mercado-pago.test/v1/orders/order-full-refund/refund");
    expect(options.headers).toEqual(expect.objectContaining({ "X-Idempotency-Key": "cooklily-customer-cancel-order-full-refund" }));
    expect(JSON.parse(String(options.body))).toEqual({});
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
