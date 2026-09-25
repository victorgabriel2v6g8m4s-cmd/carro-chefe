import crypto from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
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

async function register(phone: string, role: "customer" | "staff" | "admin" = "customer") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: role === "customer" ? "cliente-07" : "senha-privilegiada-07",
      displayName: `Teste ${role}`,
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const userId = response.json().user.id;
  if (role !== "customer") {
    await lilyPrisma.lilyUser.update({
      where: { id: userId },
      data: { role, staffPasswordUpgradeRequired: false }
    });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  expect(me.statusCode).toBe(200);
  return { cookie, csrf: me.json().csrfToken, user: me.json().user };
}

async function createOrder(input: { userId?: string; phone?: string; guestToken?: string } = {}) {
  const suffix = crypto.randomBytes(5).toString("hex");
  return lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `PAY-${suffix.toUpperCase()}`,
      idempotencyKey: `payment-order-${suffix}`,
      requestFingerprint: `payment-order-fingerprint-${suffix}`,
      guestAccessTokenHash: input.guestToken
        ? crypto.createHash("sha256").update(input.guestToken).digest("hex")
        : null,
      userId: input.userId ?? null,
      phoneNormalized: input.phone ?? "+5567999907000",
      fulfillmentType: "pickup",
      status: "awaiting_payment",
      subtotalCents: 2500,
      deliveryFeeCents: 0,
      discountTotalCents: 0,
      grandTotalCents: 2500
    }
  });
}

async function enableManualPix(admin: { cookie: string; csrf: string }) {
  const response = await app.inject({
    method: "PATCH",
    url: "/api/v1/lily/admin/payments/settings",
    headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
    payload: {
      paymentsEnabled: true,
      paymentProvider: "manual",
      manualPixEnabled: true,
      manualPixInstructions: "PIX TESTE 123 · informe o número do pedido"
    }
  });
  expect(response.statusCode).toBe(200);
}

async function cleanup() {
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyOrderItemAddon.deleteMany();
  await lilyPrisma.lilyOrderItem.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyLoyaltyEvent.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

beforeEach(async () => {
  await cleanup();
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      paymentsEnabled: false,
      paymentProvider: "manual",
      manualPixEnabled: false,
      manualPixInstructions: null
    },
    create: { id: "default" }
  });
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily Entrega 07 — pagamentos", () => {
  it("mantém pagamentos fechados por padrão e configuração financeira exige admin", async () => {
    const customer = await register("67999907001");
    const staff = await register("67999907002", "staff");
    const admin = await register("67999907003", "admin");
    const order = await createOrder({ userId: customer.user.id, phone: customer.user.phone });

    const disabled = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payments",
      headers: {
        origin,
        cookie: customer.cookie,
        "x-lily-csrf": customer.csrf,
        "idempotency-key": "payment-disabled-test-0001"
      },
      payload: { orderId: order.id, method: "manual_pix" }
    });
    expect(disabled.statusCode).toBe(503);
    expect(disabled.json().details.code).toBe("LILY_PAYMENTS_DISABLED");

    const staffPatch = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/payments/settings",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: {
        paymentsEnabled: true,
        paymentProvider: "manual",
        manualPixEnabled: true,
        manualPixInstructions: "chave teste"
      }
    });
    expect(staffPatch.statusCode).toBe(403);
    expect(staffPatch.json().details.code).toBe("LILY_ADMIN_REQUIRED");

    await enableManualPix(admin);
    const config = await app.inject({ method: "GET", url: "/api/v1/lily/public/payments/config" });
    expect(config.statusCode).toBe(200);
    expect(config.json().enabled).toBe(true);
    expect(config.json().methods).toEqual([{ id: "manual_pix", label: "Pix", confirmation: "manual" }]);
    expect(config.json()).not.toHaveProperty("manualPixInstructions");
  });

  it("protege pedido guest com token e cria pagamento idempotente sem vazar reconciliação interna", async () => {
    const admin = await register("67999907004", "admin");
    await enableManualPix(admin);
    const token = crypto.randomBytes(32).toString("base64url");
    const order = await createOrder({ guestToken: token });

    const denied = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payments",
      headers: { origin, "idempotency-key": "guest-payment-test-0001" },
      payload: { orderId: order.id, method: "manual_pix" }
    });
    expect(denied.statusCode).toBe(401);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payments",
      headers: {
        origin,
        "x-lily-order-token": token,
        "idempotency-key": "guest-payment-test-0001"
      },
      payload: { orderId: order.id, method: "manual_pix" }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().status).toBe("pending");
    expect(created.json().amountCents).toBe(2500);
    expect(created.json().instructions).toContain("PIX TESTE");
    expect(created.json()).not.toHaveProperty("providerReference");

    const replay = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payments",
      headers: {
        origin,
        "x-lily-order-token": token,
        "idempotency-key": "guest-payment-test-0001"
      },
      payload: { orderId: order.id, method: "manual_pix" }
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(created.json().id);

    const wrongToken = await app.inject({
      method: "GET",
      url: `/api/v1/lily/payments/${created.json().id}`,
      headers: { "x-lily-order-token": "token-incorreto" }
    });
    expect(wrongToken.statusCode).toBe(401);
  });

  it("aprova somente por admin, reconcilia, detecta divergência e suporta estorno parcial e total", async () => {
    const customer = await register("67999907005");
    const staff = await register("67999907006", "staff");
    const admin = await register("67999907007", "admin");
    await enableManualPix(admin);
    const order = await createOrder({ userId: customer.user.id, phone: customer.user.phone });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payments",
      headers: {
        origin,
        cookie: customer.cookie,
        "x-lily-csrf": customer.csrf,
        "idempotency-key": "customer-payment-test-0001"
      },
      payload: { orderId: order.id, method: "manual_pix" }
    });
    expect(created.statusCode).toBe(201);
    const paymentId = created.json().id;

    const staffConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/payments/${paymentId}/confirm`,
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: { providerReference: "BANK-STAFF-DENIED" }
    });
    expect(staffConfirm.statusCode).toBe(403);
    expect(staffConfirm.json().details.code).toBe("LILY_ADMIN_REQUIRED");

    const approved = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/payments/${paymentId}/confirm`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: {
        providerReference: "BANK-OK-07007",
        reportedGrossCents: 2500,
        feeCents: 0,
        netCents: 2500,
        note: "Conferido no extrato de teste"
      }
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json().status).toBe("approved");
    expect(approved.json().providerReference).toBe("BANK-OK-07007");

    const paidOrder = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(paidOrder?.status).toBe("paid");
    expect(paidOrder?.paidAt).not.toBeNull();

    const customerView = await app.inject({
      method: "GET",
      url: `/api/v1/lily/payments/${paymentId}`,
      headers: { cookie: customer.cookie }
    });
    expect(customerView.statusCode).toBe(200);
    expect(customerView.json()).not.toHaveProperty("providerReference");
    expect(customerView.json().reconciliations[0]).toEqual(expect.objectContaining({ status: "matched" }));
    expect(customerView.json().reconciliations[0]).not.toHaveProperty("note");
    expect(customerView.json().reconciliations[0]).not.toHaveProperty("feeCents");

    const discrepant = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/payments/${paymentId}/reconcile`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: {
        reportedGrossCents: 2400,
        feeCents: 100,
        netCents: 2300,
        providerReference: "BANK-DIFF-07007",
        note: "Divergência proposital"
      }
    });
    expect(discrepant.statusCode).toBe(200);
    expect(discrepant.json().status).toBe("discrepant");
    expect(discrepant.json().discrepancyCents).toBe(-100);

    const partial = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/payments/${paymentId}/refund`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { amountCents: 500, providerReference: "REFUND-PART-07007" }
    });
    expect(partial.statusCode).toBe(200);
    expect(partial.json().status).toBe("partially_refunded");
    expect(partial.json().refundedCents).toBe(500);
    expect((await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } }))?.status).toBe("paid");

    const full = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/payments/${paymentId}/refund`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { amountCents: 2000, providerReference: "REFUND-FULL-07007" }
    });
    expect(full.statusCode).toBe(200);
    expect(full.json().status).toBe("refunded");
    expect(full.json().refundedCents).toBe(2500);
    expect((await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } }))?.status).toBe("refunded");
  });
});
