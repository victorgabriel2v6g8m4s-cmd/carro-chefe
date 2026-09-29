import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { LILY_ANALYTICS_CONSENT_VERSION } from "./analytics";

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
      password: "analytics-cooklily-2026",
      displayName: `Analytics ${role}`,
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: {
        lilyMarketing: false,
        shareWithCarroChefe: false,
        analyticsOptional: true
      }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const userId = response.json().user.id;

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

  return { cookie, userId };
}

function analyticsPayload(overrides: Record<string, unknown> = {}) {
  return {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    event: "catalog_view",
    consentVersion: LILY_ANALYTICS_CONSENT_VERSION,
    occurredAt: new Date().toISOString(),
    path: "/lilyacai/cardapio",
    attribution: {
      la_qr: "QR-ANALYTICS",
      la_campaign: "adesivos",
      la_variant: "a"
    },
    metadata: { surface: "catalog" },
    ...overrides
  };
}

async function cleanup() {
  await lilyPrisma.lilyAnalyticsEvent.deleteMany();
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyDeliveryAssignment.deleteMany();
  await lilyPrisma.lilyOrderDeliveryEvent.deleteMany();
  await lilyPrisma.lilyOrderItemAddon.deleteMany();
  await lilyPrisma.lilyOrderItem.deleteMany();
  await lilyPrisma.lilyOrderOperationEvent.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
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

describe("CookLily Entrega 09 — analytics first-party", () => {
  it("aceita evento consentido minimizado e normaliza attribution legado", async () => {
    const eventId = randomUUID();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload: analyticsPayload({
        eventId,
        attribution: {
          cc_qr: "LEGACY-QR",
          cc_campaign: "banner",
          cc_variant: "b"
        },
        metadata: {
          surface: "product",
          productSlug: "acai-nutella",
          variantSizeMl: 500,
          addonCount: 2,
          itemCount: 1
        }
      })
    });

    expect(response.statusCode).toBe(202);
    const stored = await lilyPrisma.lilyAnalyticsEvent.findUnique({ where: { eventId } });
    expect(stored).toMatchObject({
      eventId,
      event: "catalog_view",
      path: "/lilyacai/cardapio",
      laQr: "LEGACY-QR",
      laCampaign: "banner",
      laVariant: "b",
      surface: "product",
      productSlug: "acai-nutella",
      variantSizeMl: 500,
      addonCount: 2,
      itemCount: 1
    });
    expect(stored?.metadataJson).not.toContain("phone");
    expect(stored?.metadataJson).not.toContain("address");
  });

  it("deduplica retry pelo eventId", async () => {
    const payload = analyticsPayload();
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(await lilyPrisma.lilyAnalyticsEvent.count({ where: { eventId: payload.eventId } })).toBe(1);
  });

  it("rejeita metadata extra que poderia carregar PII e path com query string", async () => {
    const pii = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload: analyticsPayload({
        metadata: {
          surface: "checkout",
          phone: "+5567999999999"
        }
      })
    });
    expect(pii.statusCode).toBe(400);

    const queryInPath = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload: analyticsPayload({
        path: "/lilyacai/cardapio?phone=67999999999"
      })
    });
    expect(queryInPath.statusCode).toBe(400);
    expect(await lilyPrisma.lilyAnalyticsEvent.count()).toBe(0);
  });

  it("exige a versão de consentimento analítico", async () => {
    const payload = analyticsPayload() as Record<string, unknown>;
    delete payload.consentVersion;
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload
    });
    expect(response.statusCode).toBe(400);
  });

  it("nega relatório para customer", async () => {
    const customer = await register("67999909101", "customer", "127.0.0.241");
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/analytics/summary",
      headers: { cookie: customer.cookie }
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_STAFF_REQUIRED");
  });

  it("agrega funil consentido e usa pedidos reais para métricas comerciais", async () => {
    const staff = await register("67999909102", "staff", "127.0.0.242");
    const sessionId = randomUUID();

    for (const event of ["catalog_view", "product_view", "add_to_cart", "checkout_start", "order_created", "payment_confirmed"] as const) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/lily/public/analytics/events",
        payload: analyticsPayload({
          sessionId,
          event,
          metadata: event === "product_view" || event === "add_to_cart"
            ? { surface: "product", productSlug: "acai-nutella" }
            : { surface: event === "payment_confirmed" ? "payment" : "catalog" }
        })
      });
      expect(response.statusCode).toBe(202);
    }

    await lilyPrisma.lilyOrder.create({
      data: {
        orderNumber: "AN-REAL-1",
        idempotencyKey: "analytics-real-1",
        requestFingerprint: "analytics-real-fingerprint",
        phoneNormalized: "+5567999900001",
        fulfillmentType: "pickup",
        status: "paid",
        operationStatus: "received",
        deliveryStatus: "not_applicable",
        subtotalCents: 3000,
        deliveryFeeCents: 0,
        discountTotalCents: 0,
        grandTotalCents: 3000,
        laQr: "QR-ANALYTICS",
        laCampaign: "adesivos",
        laVariant: "a",
        paidAt: new Date()
      }
    });

    await lilyPrisma.lilyOrder.create({
      data: {
        orderNumber: "AN-HOMO-1",
        idempotencyKey: "analytics-homologation-1",
        requestFingerprint: "analytics-homologation-fingerprint",
        phoneNormalized: "+5567999900002",
        fulfillmentType: "pickup",
        status: "paid",
        operationStatus: "received",
        deliveryStatus: "not_applicable",
        isHomologation: true,
        subtotalCents: 4000,
        deliveryFeeCents: 0,
        discountTotalCents: 0,
        grandTotalCents: 4000,
        laQr: "QR-ANALYTICS",
        laCampaign: "adesivos",
        laVariant: "a",
        paidAt: new Date()
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/analytics/summary?days=7&campaign=adesivos",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.orders).toEqual({
      created: 1,
      grossOrderValueCents: 3000,
      paid: 1,
      paidGrossCents: 3000
    });
    expect(body.funnel.find((row: any) => row.event === "catalog_view").sessions).toBe(1);
    expect(body.funnel.find((row: any) => row.event === "payment_confirmed").sessions).toBe(1);
    expect(body.products).toContainEqual({
      productSlug: "acai-nutella",
      views: 1,
      addToCart: 1
    });

    const withHomologation = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/analytics/summary?days=7&campaign=adesivos&includeHomologation=true",
      headers: { cookie: staff.cookie }
    });
    expect(withHomologation.statusCode).toBe(200);
    expect(withHomologation.json().orders.created).toBe(2);
    expect(withHomologation.json().orders.paidGrossCents).toBe(7000);
  });

  it("normaliza timestamp futuro ou muito antigo para o horário de ingestão", async () => {
    const futureId = randomUUID();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/analytics/events",
      payload: analyticsPayload({
        eventId: futureId,
        occurredAt: new Date(Date.now() + 60 * 60_000).toISOString()
      })
    });
    expect(response.statusCode).toBe(202);

    const stored = await lilyPrisma.lilyAnalyticsEvent.findUnique({ where: { eventId: futureId } });
    expect(stored).toBeTruthy();
    expect(Math.abs((stored?.occurredAt.getTime() ?? 0) - Date.now())).toBeLessThan(10_000);
  });
});
