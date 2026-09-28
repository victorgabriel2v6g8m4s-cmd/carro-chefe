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
      password: "operacoes-cozinha-2026",
      displayName: `Operações ${role}`,
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
    user: me.json().user,
    cookie,
    csrf: me.json().csrfToken
  };
}

async function createOrder(input: {
  userId?: string | null;
  financialStatus?: string;
  operationStatus?: string;
} = {}) {
  const created = await lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `OPS-${Math.random().toString(16).slice(2, 12).toUpperCase()}`,
      idempotencyKey: `ops-idem-${crypto.randomUUID()}`,
      requestFingerprint: `ops-fingerprint-${crypto.randomUUID()}`,
      userId: input.userId ?? null,
      phoneNormalized: "+5567999912345",
      fulfillmentType: "delivery",
      status: input.financialStatus ?? "awaiting_payment",
      operationStatus: input.operationStatus ?? "received",
      subtotalCents: 2500,
      deliveryFeeCents: 500,
      discountTotalCents: 0,
      grandTotalCents: 3000,
      addressSnapshotJson: JSON.stringify({
        postalCode: "79000000",
        neighborhood: "Centro",
        street: "Rua privada",
        number: "123"
      }),
      operationEvents: {
        create: {
          fromStatus: null,
          toStatus: input.operationStatus ?? "received",
          actor: "system:test"
        }
      }
    }
  });
  return created;
}

async function cleanup() {
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
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

describe("CookLily Entrega 11B — fila da cozinha", () => {
  it("nega fila operacional para customer", async () => {
    const customer = await register("67999908101", "customer", "127.0.0.221");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/kitchen/orders",
      headers: { cookie: customer.cookie }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_STAFF_REQUIRED");
  });

  it("expõe somente os dados necessários da cozinha, sem telefone/endereço do cliente", async () => {
    const staff = await register("67999908102", "staff", "127.0.0.222");
    const order = await createOrder();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/kitchen/orders",
      headers: { cookie: staff.cookie }
    });

    expect(response.statusCode).toBe(200);
    const row = response.json().orders.find((item: any) => item.id === order.id);
    expect(row).toMatchObject({
      id: order.id,
      financialStatus: "awaiting_payment",
      operationStatus: "received",
      fulfillmentType: "delivery"
    });
    expect(row).not.toHaveProperty("phoneNormalized");
    expect(row).not.toHaveProperty("address");
    expect(JSON.stringify(row)).not.toContain("Rua privada");
  });

  it("exige CSRF para avançar etapa operacional", async () => {
    const staff = await register("67999908103", "staff", "127.0.0.223");
    const order = await createOrder();

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/kitchen/orders/${order.id}/advance`,
      headers: {
        origin,
        cookie: staff.cookie
      },
      payload: {}
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_CSRF_REQUIRED");
  });

  it("mantém pagamento e cozinha separados e só libera montagem após pagamento", async () => {
    const staff = await register("67999908104", "staff", "127.0.0.224");
    const order = await createOrder();

    const receive = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/kitchen/orders/${order.id}/advance`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      },
      payload: { note: "Pedido visualizado na cozinha" }
    });
    expect(receive.statusCode).toBe(200);
    expect(receive.json().operationStatus).toBe("waiting_payment");
    expect(receive.json().financialStatus).toBe("awaiting_payment");

    const blocked = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/kitchen/orders/${order.id}/advance`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      },
      payload: {}
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().details.code).toBe("LILY_ORDER_PAYMENT_REQUIRED");

    await lilyPrisma.lilyOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: new Date()
      }
    });

    const prepare = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/kitchen/orders/${order.id}/advance`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      },
      payload: { note: "Pagamento conferido" }
    });
    expect(prepare.statusCode).toBe(200);
    expect(prepare.json().operationStatus).toBe("preparing");
    expect(prepare.json().financialStatus).toBe("paid");

    const dispatch = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/kitchen/orders/${order.id}/advance`,
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf
      },
      payload: { note: "Pedido embalado" }
    });
    expect(dispatch.statusCode).toBe(200);
    expect(dispatch.json().operationStatus).toBe("ready_for_dispatch");

    const stored = await lilyPrisma.lilyOrder.findUnique({
      where: { id: order.id },
      include: { operationEvents: { orderBy: { createdAt: "asc" } } }
    });
    expect(stored?.status).toBe("paid");
    expect(stored?.operationEvents.map((event) => event.toStatus)).toEqual([
      "received",
      "waiting_payment",
      "preparing",
      "ready_for_dispatch"
    ]);
  });
});
