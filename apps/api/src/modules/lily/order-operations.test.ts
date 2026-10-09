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

async function register(
  phone: string,
  role: "customer" | "staff" | "admin",
  remoteAddress: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    remoteAddress,
    headers: { origin },
    payload: {
      phone,
      password: "controle-pedidos-2026",
      displayName: `Controle ${role}`,
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
      data: {
        role,
        staffPasswordUpgradeRequired: false,
        mfaEnabled: true
      }
    });
    await lilyPrisma.lilySession.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: new Date() }
    });
  }

  const me = await app.inject({
    method: "GET",
    url: "/api/v1/lily/auth/me",
    headers: { cookie }
  });
  expect(me.statusCode).toBe(200);

  return {
    userId,
    cookie,
    csrf: me.json().csrfToken
  };
}

async function createOrder(input: {
  financialStatus?: string;
  operationStatus?: string;
  fulfillmentType?: "pickup" | "delivery";
  deliveryStatus?: string;
  operationUpdatedAt?: Date;
} = {}) {
  const fulfillmentType = input.fulfillmentType ?? "delivery";
  return lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `CTL-${Math.random().toString(16).slice(2, 12).toUpperCase()}`,
      idempotencyKey: `ctl-idem-${crypto.randomUUID()}`,
      requestFingerprint: `ctl-fingerprint-${crypto.randomUUID()}`,
      phoneNormalized: "+5567999988888",
      fulfillmentType,
      status: input.financialStatus ?? "awaiting_payment",
      operationStatus: input.operationStatus ?? "received",
      operationUpdatedAt: input.operationUpdatedAt ?? new Date(),
      deliveryStatus: input.deliveryStatus ?? (fulfillmentType === "delivery" ? "not_ready" : "not_applicable"),
      deliveryUpdatedAt: new Date(),
      subtotalCents: 2700,
      deliveryFeeCents: fulfillmentType === "delivery" ? 500 : 0,
      discountTotalCents: 0,
      grandTotalCents: fulfillmentType === "delivery" ? 3200 : 2700,
      addressSnapshotJson: fulfillmentType === "delivery"
        ? JSON.stringify({
            postalCode: "79000000",
            neighborhood: "Centro",
            street: "Rua privada da torre",
            number: "777"
          })
        : null,
      operationEvents: {
        create: {
          fromStatus: null,
          toStatus: input.operationStatus ?? "received",
          actor: "system:test"
        }
      }
    }
  });
}

async function cleanup() {
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
  await lilyPrisma.lilyOperationalSettings.updateMany({
    data: { kitchenPreparationSlaMinutes: null }
  });
}

beforeEach(cleanup);

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily Entrega 08 — torre de controle de pedidos", () => {
  it("nega overview para customer", async () => {
    const customer = await register("67999908201", "customer", "127.0.0.231");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview",
      headers: { cookie: customer.cookie }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_STAFF_REQUIRED");
  });

  it("consolida estados sem expor telefone, endereço ou códigos logísticos", async () => {
    const staff = await register("67999908202", "staff", "127.0.0.232");
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "waiting_payment",
      fulfillmentType: "delivery",
      deliveryStatus: "not_ready"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview?state=active",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    const row = response.json().orders.find((item: any) => item.id === order.id);
    expect(row).toMatchObject({
      id: order.id,
      financialStatus: "paid",
      operationStatus: "waiting_payment",
      fulfillmentType: "delivery",
      flowState: "active",
      attention: ["paid_waiting_kitchen"]
    });
    expect(row.nextAction).toMatchObject({
      kind: "kitchen",
      path: "/painel/cozinha"
    });

    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("+5567999988888");
    expect(serialized).not.toContain("Rua privada da torre");
    expect(row).not.toHaveProperty("phoneNormalized");
    expect(row).not.toHaveProperty("address");
    expect(row).not.toHaveProperty("pickupCode");
    expect(row).not.toHaveProperty("deliveryCode");
  });

  it("destaca SLA vencido na visão de atenção", async () => {
    const staff = await register("67999908203", "staff", "127.0.0.233");
    await lilyPrisma.lilyOperationalSettings.upsert({
      where: { id: "default" },
      update: { kitchenPreparationSlaMinutes: 10 },
      create: { id: "default", kitchenPreparationSlaMinutes: 10 }
    });
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "preparing",
      fulfillmentType: "pickup",
      operationUpdatedAt: new Date(Date.now() - 15 * 60_000)
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview?state=attention",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    const row = response.json().orders.find((item: any) => item.id === order.id);
    expect(row.attention).toContain("preparation_overdue");
    expect(row.sla.status).toBe("overdue");
    expect(response.json().summary.attention).toBeGreaterThanOrEqual(1);
  });

  it("conclui retirada paga e pronta com evento e auditoria", async () => {
    const staff = await register("67999908204", "staff", "127.0.0.234");
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "ready_for_dispatch",
      fulfillmentType: "pickup",
      deliveryStatus: "not_applicable"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/orders/${order.id}/complete-pickup`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: order.id,
      operationStatus: "completed",
      flowState: "completed",
      nextAction: null
    });

    const stored = await lilyPrisma.lilyOrder.findUnique({
      where: { id: order.id },
      include: { operationEvents: { orderBy: { createdAt: "asc" } } }
    });
    expect(stored?.completedAt).toBeTruthy();
    expect(stored?.operationEvents.at(-1)?.toStatus).toBe("completed");

    const audit = await lilyPrisma.lilyAdminAudit.findFirst({
      where: { action: "order.pickup.complete", entityId: order.id }
    });
    expect(audit).toBeTruthy();
  });

  it("exige CSRF para confirmar retirada", async () => {
    const staff = await register("67999908205", "staff", "127.0.0.235");
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "ready_for_dispatch",
      fulfillmentType: "pickup"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/orders/${order.id}/complete-pickup`,
      headers: {
        origin,
        cookie: staff.cookie
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_CSRF_REQUIRED");
  });

  it("não usa o fluxo de retirada para concluir entrega", async () => {
    const staff = await register("67999908206", "staff", "127.0.0.236");
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "ready_for_dispatch",
      fulfillmentType: "delivery",
      deliveryStatus: "waiting_courier"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/orders/${order.id}/complete-pickup`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().details.code).toBe("LILY_PICKUP_COMPLETION_NOT_PICKUP");
  });

  it("retira pedido concluído da fila ativa e o mostra no filtro concluído", async () => {
    const staff = await register("67999908207", "staff", "127.0.0.237");
    const order = await createOrder({
      financialStatus: "paid",
      operationStatus: "completed",
      fulfillmentType: "pickup"
    });

    const active = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview?state=active",
      headers: { cookie: staff.cookie }
    });
    expect(active.statusCode).toBe(200);
    expect(active.json().orders.some((item: any) => item.id === order.id)).toBe(false);

    const completed = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview?state=completed",
      headers: { cookie: staff.cookie }
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().orders.some((item: any) => item.id === order.id)).toBe(true);
  });
  it("busca cancelados no banco antes do limite de 200 pedidos recentes", async () => {
    const staff = await register("67999908208", "staff", "127.0.0.238");
    const cancelled = await createOrder({
      financialStatus: "awaiting_payment",
      operationStatus: "cancelled",
      fulfillmentType: "delivery",
      deliveryStatus: "waiting_courier"
    });

    await lilyPrisma.lilyOrder.update({
      where: { id: cancelled.id },
      data: { createdAt: new Date(Date.now() - 24 * 60 * 60_000) }
    });

    // More recent active orders used to crowd this cancelled order out before
    // the in-memory state filter ran.
    for (let index = 0; index < 201; index += 1) {
      await createOrder({
        financialStatus: "awaiting_payment",
        operationStatus: "received",
        fulfillmentType: "pickup",
        deliveryStatus: "not_applicable"
      });
    }

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/orders/overview?state=cancelled",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    const row = response.json().orders.find((item: any) => item.id === cancelled.id);
    expect(row).toMatchObject({
      id: cancelled.id,
      flowState: "cancelled",
      operationStatus: "cancelled"
    });
    expect(response.json().orders).toHaveLength(1);
  });

});
