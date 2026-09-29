import crypto from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp, SENSITIVE_LOG_REDACT_PATHS } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(
  phone: string,
  role: "customer" | "staff",
  remoteAddress: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    remoteAddress,
    headers: { origin },
    payload: {
      phone,
      password: "observability-cooklily-2026",
      displayName: "Observability Test",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: {
        lilyMarketing: false,
        shareWithCarroChefe: false,
        analyticsOptional: false
      }
    }
  });
  expect(response.statusCode).toBe(201);
  const userId = response.json().user.id;
  const cookie = cookieFrom(response);

  if (role === "staff") {
    await lilyPrisma.lilyUser.update({
      where: { id: userId },
      data: {
        role: "staff",
        staffPasswordUpgradeRequired: false,
        mfaEnabled: true
      }
    });
    await lilyPrisma.lilySession.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: new Date() }
    });
  }

  return { userId, cookie };
}

async function cleanup() {
  await lilyPrisma.lilyAnalyticsEvent.deleteMany();
  await lilyPrisma.lilyWhatsAppNotification.deleteMany();
  await lilyPrisma.lilyPixSettlement.deleteMany();
  await lilyPrisma.lilyPixReconciliationState.deleteMany();
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyDeliveryAssignment.deleteMany();
  await lilyPrisma.lilyOrderDeliveryEvent.deleteMany();
  await lilyPrisma.lilyOrderItemAddon.deleteMany();
  await lilyPrisma.lilyOrderItem.deleteMany();
  await lilyPrisma.lilyOrderOperationEvent.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyDeliveryRouteEstimate.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

beforeEach(cleanup);

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily Entrega 10A — observabilidade", () => {
  it("expõe request id e mantém lista explícita de headers sensíveis redatados", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/public/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");

    expect(SENSITIVE_LOG_REDACT_PATHS).toEqual(expect.arrayContaining([
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-lily-csrf"]',
      'req.headers["x-lily-order-token"]',
      'req.headers["x-agent-key"]',
      'req.headers["x-carrochefe-signature"]',
      'req.headers["x-signature"]',
      'res.headers["set-cookie"]'
    ]));
  });

  it("nega o resumo operacional a customer", async () => {
    const customer = await register("67999901001", "customer", "127.0.0.251");
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/observability/summary",
      headers: { cookie: customer.cookie }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_STAFF_REQUIRED");
  });

  it("retorna somente agregados operacionais sem PII ou payload bruto de providers", async () => {
    const staff = await register("67999901002", "staff", "127.0.0.252");

    const order = await lilyPrisma.lilyOrder.create({
      data: {
        orderNumber: "OBS-001",
        idempotencyKey: `obs-${crypto.randomUUID()}`,
        requestFingerprint: `obs-fp-${crypto.randomUUID()}`,
        phoneNormalized: "+5567999912345",
        fulfillmentType: "delivery",
        status: "paid",
        operationStatus: "preparing",
        deliveryStatus: "not_ready",
        subtotalCents: 3000,
        deliveryFeeCents: 500,
        discountTotalCents: 0,
        grandTotalCents: 3500,
        addressSnapshotJson: JSON.stringify({
          street: "Rua que não pode aparecer",
          number: "123",
          neighborhood: "Centro"
        })
      }
    });

    await lilyPrisma.lilyWhatsAppNotification.create({
      data: {
        orderId: order.id,
        stage: "preparing",
        status: "failed",
        attempts: 2,
        lastErrorCode: "SEND_FAILED",
        lastErrorMessage: "Bearer segredo-que-nao-pode-aparecer"
      }
    });

    await lilyPrisma.lilyPixSettlement.create({
      data: {
        source: "pix_api_v2",
        providerEventId: "pix_api_v2:E999",
        endToEndId: "E999",
        txid: "TXOBS",
        amountCents: 3500,
        occurredAt: new Date(),
        payloadHash: "a".repeat(64),
        matchStatus: "unmatched"
      }
    });

    await lilyPrisma.lilyPixReconciliationState.create({
      data: {
        source: "pix_api_v2",
        lastAttemptAt: new Date(),
        lastErrorCode: "POLL_FAILED",
        lastErrorMessage: "mTLS private detail"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/observability/summary",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      database: { status: "ok" },
      orders: {
        paidActive: 1,
        preparing: 1
      },
      whatsapp: {
        pending: 0,
        failed: 1,
        dead: 0
      },
      pixReconciliation: {
        reviewRequired: 1,
        lastErrorCode: "POLL_FAILED"
      }
    });

    const serialized = response.body;
    expect(serialized).not.toContain("+5567999912345");
    expect(serialized).not.toContain("Rua que não pode aparecer");
    expect(serialized).not.toContain("segredo-que-nao-pode-aparecer");
    expect(serialized).not.toContain("mTLS private detail");
    expect(serialized).not.toContain("E999");
    expect(serialized).not.toContain("TXOBS");
  });
});
