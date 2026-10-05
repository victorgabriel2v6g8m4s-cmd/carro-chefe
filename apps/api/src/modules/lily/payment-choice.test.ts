import crypto from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(phone: string, role: "customer" | "admin" = "customer") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: role === "admin" ? "senha-privilegiada-choice" : "cliente-choice",
      displayName: `Choice ${role}`,
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const userId = response.json().user.id;
  if (role === "admin") {
    await lilyPrisma.lilyUser.update({
      where: { id: userId },
      data: { role: "admin", staffPasswordUpgradeRequired: false, mfaEnabled: true }
    });
    await lilyPrisma.lilySession.updateMany({ where: { userId }, data: { mfaVerifiedAt: new Date() } });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  expect(me.statusCode).toBe(200);
  return { cookie, csrf: me.json().csrfToken, user: me.json().user };
}

async function createOrder(userId: string, phone: string, total = 2500, deliveryFee = 0) {
  const suffix = crypto.randomBytes(6).toString("hex");
  return lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `CHOICE-${suffix.toUpperCase()}`,
      idempotencyKey: `choice-order-${suffix}`,
      requestFingerprint: `choice-fingerprint-${suffix}`,
      userId,
      phoneNormalized: phone,
      fulfillmentType: deliveryFee ? "delivery" : "pickup",
      status: "awaiting_payment",
      subtotalCents: total - deliveryFee,
      deliveryFeeCents: deliveryFee,
      discountTotalCents: 0,
      grandTotalCents: total
    }
  });
}

async function resetMethodSettings() {
  for (const method of ["pix", "credit_card", "debit_card"]) {
    await lilyPrisma.$executeRawUnsafe(
      `UPDATE "LilyPaymentMethodSetting"
          SET "enabled" = 1, "discountType" = 'none', "discountValue" = 0,
              "maxDiscountCents" = NULL, "minimumOrderCents" = 0,
              "updatedAt" = CURRENT_TIMESTAMP
        WHERE "method" = ?`,
      method
    );
  }
}

async function cleanup() {
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

beforeEach(async () => {
  await cleanup();
  await resetMethodSettings();
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      paymentsEnabled: false,
      manualPixEnabled: false,
      manualPixInstructions: null,
      mercadoPagoPixEnabled: false,
      mercadoPagoCardEnabled: false
    },
    create: { id: "default" }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of [
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_PUBLIC_KEY",
    "MERCADO_PAGO_WEBHOOK_SECRET",
    "MERCADO_PAGO_API_BASE_URL",
    "COOKLILY_PIX_KEY",
    "COOKLILY_PIX_MERCHANT_NAME",
    "COOKLILY_PIX_MERCHANT_CITY"
  ]) delete process.env[name];
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily — escolha de pagamento e descontos", () => {
  it("publica Pix + crédito + débito simultaneamente e calcula desconto sem atingir frete", async () => {
    process.env.COOKLILY_PIX_KEY = "67999999999";
    process.env.COOKLILY_PIX_MERCHANT_NAME = "COOKLILY";
    process.env.COOKLILY_PIX_MERCHANT_CITY = "CAMPO GRANDE";
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-access";
    process.env.MERCADO_PAGO_PUBLIC_KEY = "TEST-public";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-choice";

    const admin = await register("67999908101", "admin");
    const customer = await register("67999908102");

    const configured = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/payment-options/settings",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: {
        paymentsEnabled: true,
        manualPixEnabled: true,
        manualPixInstructions: "Chave manual de contingência",
        mercadoPagoPixEnabled: true,
        mercadoPagoCardEnabled: true,
        methods: [
          { method: "pix", enabled: true, discountType: "percentage", discountValue: 1000, maxDiscountCents: null, minimumOrderCents: 0 },
          { method: "credit_card", enabled: true, discountType: "none", discountValue: 0, maxDiscountCents: null, minimumOrderCents: 0 },
          { method: "debit_card", enabled: true, discountType: "fixed", discountValue: 200, maxDiscountCents: null, minimumOrderCents: 0 }
        ]
      }
    });
    expect(configured.statusCode).toBe(200);

    const order = await createOrder(customer.user.id, customer.user.phone, 3000, 500);
    const options = await app.inject({
      method: "GET",
      url: `/api/v1/lily/orders/${order.id}/payment-options`,
      headers: { cookie: customer.cookie }
    });
    expect(options.statusCode).toBe(200);
    const methods = Object.fromEntries(options.json().methods.map((row: any) => [row.id, row]));
    expect(methods.pix.providers).toEqual(["cooklily_pix", "mercado_pago", "manual"]);
    expect(methods.pix.pricing.discountCents).toBe(250);
    expect(methods.pix.pricing.amountCents).toBe(2750);
    expect(methods.credit_card.available).toBe(true);
    expect(methods.debit_card.available).toBe(true);
    expect(methods.debit_card.pricing.discountCents).toBe(200);
    expect(methods.debit_card.pricing.amountCents).toBe(2800);
  });

  it("usa BR Code CookLily como primeira rota Pix e congela desconto/provider no pagamento", async () => {
    process.env.COOKLILY_PIX_KEY = "67999999999";
    process.env.COOKLILY_PIX_MERCHANT_NAME = "COOKLILY";
    process.env.COOKLILY_PIX_MERCHANT_CITY = "CAMPO GRANDE";
    const customer = await register("67999908103");
    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: { paymentsEnabled: true, manualPixEnabled: true, manualPixInstructions: "fallback manual" }
    });
    await lilyPrisma.$executeRawUnsafe(
      `UPDATE "LilyPaymentMethodSetting" SET "discountType"='percentage', "discountValue"=500 WHERE "method"='pix'`
    );
    const order = await createOrder(customer.user.id, customer.user.phone, 2000, 0);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payment-options",
      headers: {
        origin,
        cookie: customer.cookie,
        "x-lily-csrf": customer.csrf,
        "idempotency-key": "choice-own-pix-00000001"
      },
      payload: { orderId: order.id, method: "pix" }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().provider).toBe("cooklily_pix");
    expect(created.json().method).toBe("pix");
    expect(created.json().pricing.baseAmountCents).toBe(2000);
    expect(created.json().pricing.discountCents).toBe(100);
    expect(created.json().amountCents).toBe(1900);
    expect(created.json().providerData.qrCode).toContain("br.gov.bcb.pix");
    expect(created.json().routing.fallbackChain).toEqual(["cooklily_pix", "manual"]);
  });

  it("trata Pix manual apenas como último fallback, mantendo method=Pix", async () => {
    const customer = await register("67999908104");
    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        paymentsEnabled: true,
        manualPixEnabled: true,
        manualPixInstructions: "PIX MANUAL FALLBACK",
        mercadoPagoPixEnabled: false
      }
    });
    const order = await createOrder(customer.user.id, customer.user.phone);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payment-options",
      headers: {
        origin,
        cookie: customer.cookie,
        "x-lily-csrf": customer.csrf,
        "idempotency-key": "choice-manual-fallback-0001"
      },
      payload: { orderId: order.id, method: "pix" }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().provider).toBe("manual");
    expect(created.json().method).toBe("pix");
    expect(created.json().instructions).toBe("PIX MANUAL FALLBACK");
  });

  it("envia débito ao Mercado Pago como debit_card e força uma parcela", async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-access";
    process.env.MERCADO_PAGO_PUBLIC_KEY = "TEST-public";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-choice";
    process.env.MERCADO_PAGO_API_BASE_URL = "http://mercado-pago.test";
    const customer = await register("67999908105");
    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: { paymentsEnabled: true, mercadoPagoCardEnabled: true }
    });
    const order = await createOrder(customer.user.id, customer.user.phone, 3200);
    let sentBody: any = null;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      sentBody = JSON.parse(String(init.body));
      return new Response(JSON.stringify({
        id: "mp-order-debit-1",
        status: "processed",
        transactions: {
          payments: [{
            id: "mp-payment-debit-1",
            status: "processed",
            status_detail: "accredited",
            amount: "32.00",
            paid_amount: "32.00",
            payment_method: { id: "debvisa", type: "debit_card", installments: 1 }
          }]
        }
      }), { status: 201, headers: { "content-type": "application/json" } });
    }));

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payment-options",
      headers: {
        origin,
        cookie: customer.cookie,
        "x-lily-csrf": customer.csrf,
        "idempotency-key": "choice-debit-card-000001"
      },
      payload: {
        orderId: order.id,
        method: "debit_card",
        payer: { email: "cliente@example.com" },
        card: { token: "12345678901234567890", paymentMethodId: "debvisa", installments: 6 }
      }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().provider).toBe("mercado_pago");
    expect(created.json().method).toBe("debit_card");
    expect(created.json().status).toBe("approved");
    expect(sentBody.transactions.payments[0].payment_method.type).toBe("debit_card");
    expect(sentBody.transactions.payments[0].payment_method.installments).toBe(1);
    const storedOrder = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(storedOrder?.status).toBe("paid");
  });
});
