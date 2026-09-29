import crypto from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { lilyOrderSecurityCode } from "./logistics-codes";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(
  phone: string,
  role: "customer" | "courier" | "admin",
  remoteAddress: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    remoteAddress,
    headers: { origin },
    payload: {
      phone,
      password: role === "customer" ? "cliente-logistica-2026" : "privilegiado-logistica-2026",
      displayName: `Logística ${role}`,
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
    cookie,
    csrf: me.json().csrfToken,
    user: me.json().user
  };
}

async function createDelivery(input: {
  status?: string;
  operationStatus?: string;
  deliveryStatus?: string;
  courierUserId?: string | null;
} = {}) {
  const suffix = crypto.randomBytes(5).toString("hex");
  return lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `DEL-${suffix.toUpperCase()}`,
      idempotencyKey: `delivery-${suffix}`,
      requestFingerprint: `delivery-fingerprint-${suffix}`,
      phoneNormalized: "+5567999910101",
      fulfillmentType: "delivery",
      status: input.status ?? "paid",
      operationStatus: input.operationStatus ?? "ready_for_dispatch",
      operationUpdatedAt: new Date(),
      deliveryStatus: input.deliveryStatus ?? "waiting_courier",
      deliveryUpdatedAt: new Date(),
      courierUserId: input.courierUserId ?? null,
      subtotalCents: 2800,
      deliveryFeeCents: 500,
      discountTotalCents: 0,
      grandTotalCents: 3300,
      addressSnapshotJson: JSON.stringify({
        postalCode: "79000000",
        street: "Rua Secreta",
        number: "123",
        complement: "Casa 2",
        neighborhood: "Centro",
        city: "Campo Grande",
        state: "MS",
        reference: "Portão preto"
      }),
      items: {
        create: {
          productId: "produto-logistica",
          variantId: "variante-logistica",
          productNameSnapshot: "Pedido teste",
          variantNameSnapshot: "300 ml",
          sizeMl: 300,
          configurationHash: "abcdefabcdefabcdefabcdef",
          configurationSnapshotJson: "{}",
          flavorsSnapshotJson: "[]",
          unitPriceSnapshotCents: 2800,
          quantity: 1,
          lineTotalCents: 2800
        }
      },
      deliveryEvents: {
        create: {
          fromStatus: "not_ready",
          toStatus: input.deliveryStatus ?? "waiting_courier",
          actor: "staff:test"
        }
      }
    }
  });
}

async function cleanup() {
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyOrderItemAddon.deleteMany();
  await lilyPrisma.lilyOrderItem.deleteMany();
  await lilyPrisma.lilyDeliveryAssignment.deleteMany();
  await lilyPrisma.lilyOrderDeliveryEvent.deleteMany();
  await lilyPrisma.lilyOrderOperationEvent.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

beforeEach(async () => {
  process.env.COOKLILY_LOGISTICS_CODE_KEY = Buffer.alloc(32, 11).toString("base64url");
  await cleanup();
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      pickupAddressText: "Av. Teste, 100 · Campo Grande/MS"
    },
    create: {
      id: "default",
      pickupAddressText: "Av. Teste, 100 · Campo Grande/MS"
    }
  });
});

afterEach(() => {
  delete process.env.COOKLILY_LOGISTICS_CODE_KEY;
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily Entrega 11D — logística de entregadores", () => {
  it("nega a fila para customer e exige papel courier/admin", async () => {
    const customer = await register("67999908201", "customer", "127.0.0.231");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: customer.cookie }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().details.code).toBe("LILY_COURIER_REQUIRED");
  });

  it("não expõe rua antes do aceite e revela endereço completo somente ao entregador responsável", async () => {
    const courier = await register("67999908202", "courier", "127.0.0.232");
    const order = await createDelivery();

    const queue = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: courier.cookie }
    });
    expect(queue.statusCode).toBe(200);
    expect(queue.json().pickupAddressText).toContain("Av. Teste");

    const available = queue.json().available.find((row: any) => row.id === order.id);
    expect(available).toMatchObject({
      id: order.id,
      assignedToMe: false,
      deliveryStatus: "waiting_courier",
      destination: {
        neighborhood: "Centro",
        city: "Campo Grande",
        state: "MS"
      }
    });
    expect(JSON.stringify(available)).not.toContain("Rua Secreta");
    expect(JSON.stringify(available)).not.toContain("Portão preto");

    const accepted = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: {
        origin,
        cookie: courier.cookie,
        "x-lily-csrf": courier.csrf
      }
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({
      assignedToMe: true,
      deliveryStatus: "courier_accepted",
      destination: {
        street: "Rua Secreta",
        number: "123",
        reference: "Portão preto"
      }
    });
  });

  it("aceite é atômico e impede dois entregadores de assumirem o mesmo pedido", async () => {
    const first = await register("67999908203", "courier", "127.0.0.233");
    const second = await register("67999908204", "courier", "127.0.0.234");
    const order = await createDelivery();

    const accepted = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: first.cookie, "x-lily-csrf": first.csrf }
    });
    expect(accepted.statusCode).toBe(200);

    const conflict = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: second.cookie, "x-lily-csrf": second.csrf }
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().details.code).toBe("LILY_DELIVERY_ALREADY_CLAIMED");

    const stored = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(stored?.courierUserId).toBe(first.user.id);
  });

  it("ETA/mapa falha aberto quando o provider não está configurado", async () => {
    const originalKey = process.env.COOKLILY_ORS_API_KEY;
    delete process.env.COOKLILY_ORS_API_KEY;
    try {
      const courier = await register("67999908215", "courier", ["127", "0", "0", "246"].join("."));
      const order = await createDelivery();

      const accepted = await app.inject({
        method: "POST",
        url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
        headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf }
      });
      expect(accepted.statusCode).toBe(200);

      const route = await app.inject({
        method: "GET",
        url: `/api/v1/lily/courier/deliveries/${order.id}/route`,
        headers: { cookie: courier.cookie }
      });
      expect(route.statusCode).toBe(200);
      expect(route.json()).toMatchObject({
        available: false,
        reason: "not_configured",
        provider: "openrouteservice"
      });

      const stillAssigned = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
      expect(stillAssigned?.courierUserId).toBe(courier.user.id);
      expect(stillAssigned?.deliveryStatus).toBe("courier_accepted");
    } finally {
      if (originalKey === undefined) delete process.env.COOKLILY_ORS_API_KEY;
      else process.env.COOKLILY_ORS_API_KEY = originalKey;
    }
  });

  it("permite recusar a oferta sem retirar a entrega da fila dos demais couriers", async () => {
    const first = await register("67999908206", "courier", "127.0.0.236");
    const second = await register("67999908207", "courier", "127.0.0.237");
    const order = await createDelivery();

    const rejected = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/reject`,
      headers: { origin, cookie: first.cookie, "x-lily-csrf": first.csrf },
      payload: { reason: "route_not_viable", note: "fora da rota atual" }
    });
    expect(rejected.statusCode).toBe(200);

    const firstQueue = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: first.cookie }
    });
    expect(firstQueue.json().available.some((row: any) => row.id === order.id)).toBe(false);

    const secondQueue = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: second.cookie }
    });
    expect(secondQueue.json().available.some((row: any) => row.id === order.id)).toBe(true);

    const audit = await lilyPrisma.lilyAdminAudit.findFirst({
      where: { actorUserId: first.user.id, action: "delivery.reject", entityId: order.id }
    });
    expect(audit?.payloadJson).toContain("route_not_viable");
  });

  it("desistência antes da coleta devolve o pedido à fila e preserva histórico sem expor endereço antigo", async () => {
    const first = await register("67999908208", "courier", "127.0.0.238");
    const second = await register("67999908209", "courier", "127.0.0.239");
    const order = await createDelivery();

    const accepted = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: first.cookie, "x-lily-csrf": first.csrf }
    });
    expect(accepted.statusCode).toBe(200);

    const abandoned = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/abandon`,
      headers: { origin, cookie: first.cookie, "x-lily-csrf": first.csrf },
      payload: { reason: "vehicle", note: "pneu furado" }
    });
    expect(abandoned.statusCode).toBe(200);
    expect(abandoned.json()).toMatchObject({
      assignedToMe: false,
      deliveryStatus: "waiting_courier"
    });
    expect(JSON.stringify(abandoned.json())).not.toContain("Rua Secreta");

    const stored = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(stored?.courierUserId).toBeNull();

    const assignments = await lilyPrisma.lilyDeliveryAssignment.findMany({
      where: { orderId: order.id },
      orderBy: { assignedAt: "asc" }
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      courierUserId: first.user.id,
      status: "abandoned",
      endReason: "vehicle"
    });
    expect(assignments[0]?.endedAt).not.toBeNull();

    const firstQueue = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: first.cookie }
    });
    expect(firstQueue.json().available.some((row: any) => row.id === order.id)).toBe(false);

    const secondQueue = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: second.cookie }
    });
    expect(secondQueue.json().available.some((row: any) => row.id === order.id)).toBe(true);

    const history = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries/history?status=abandoned",
      headers: { cookie: first.cookie }
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().total).toBe(1);
    expect(history.json().items[0].assignment.status).toBe("abandoned");
    expect(JSON.stringify(history.json())).not.toContain("Rua Secreta");
    expect(JSON.stringify(history.json())).not.toContain("Portão preto");
  });

  it("bloqueia desistência e reatribuição depois que a coleta foi confirmada", async () => {
    const courier = await register("67999908210", "courier", "127.0.0.240");
    const admin = await register("67999908211", "admin", "127.0.0.241");
    const order = await createDelivery();

    const accept = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf }
    });
    expect(accept.statusCode).toBe(200);

    const arrived = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/transition`,
      headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf },
      payload: { action: "arrived_pickup" }
    });
    expect(arrived.statusCode).toBe(200);

    const pickup = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/transition`,
      headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf },
      payload: { action: "confirm_pickup", code: lilyOrderSecurityCode(order.id, "pickup") }
    });
    expect(pickup.statusCode).toBe(200);
    expect(pickup.json().deliveryStatus).toBe("picked_up");

    const abandon = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/abandon`,
      headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf },
      payload: { reason: "personal" }
    });
    expect(abandon.statusCode).toBe(409);
    expect(abandon.json().details.code).toBe("LILY_DELIVERY_REASSIGNMENT_LOCKED");

    const reassign = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/deliveries/${order.id}/reassign`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { courierUserId: null, reason: "support" }
    });
    expect(reassign.statusCode).toBe(409);
    expect(reassign.json().details.code).toBe("LILY_DELIVERY_REASSIGNMENT_LOCKED");
  });

  it("admin reatribui atomicamente e histórico mantém os dois vínculos", async () => {
    const first = await register("67999908212", "courier", "127.0.0.242");
    const second = await register("67999908213", "courier", "127.0.0.243");
    const admin = await register("67999908214", "admin", "127.0.0.244");
    const order = await createDelivery();

    const accepted = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: first.cookie, "x-lily-csrf": first.csrf }
    });
    expect(accepted.statusCode).toBe(200);

    const reassigned = await app.inject({
      method: "POST",
      url: `/api/v1/lily/admin/deliveries/${order.id}/reassign`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: {
        courierUserId: second.user.id,
        reason: "operational",
        note: "redistribuição de rota"
      }
    });
    expect(reassigned.statusCode).toBe(200);
    expect(reassigned.json().deliveryStatus).toBe("courier_accepted");

    const stored = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(stored?.courierUserId).toBe(second.user.id);

    const assignments = await lilyPrisma.lilyDeliveryAssignment.findMany({
      where: { orderId: order.id },
      orderBy: { assignedAt: "asc" }
    });
    expect(assignments).toHaveLength(2);
    expect(assignments.map((row) => row.status)).toEqual(["reassigned", "active"]);
    expect(assignments[0]?.courierUserId).toBe(first.user.id);
    expect(assignments[1]?.courierUserId).toBe(second.user.id);

    const firstMine = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: first.cookie }
    });
    expect(firstMine.json().mine.some((row: any) => row.id === order.id)).toBe(false);

    const secondMine = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries",
      headers: { cookie: second.cookie }
    });
    expect(secondMine.json().mine.some((row: any) => row.id === order.id)).toBe(true);

    const adminHistory = await app.inject({
      method: "GET",
      url: `/api/v1/lily/admin/deliveries/history?courierUserId=${encodeURIComponent(first.user.id)}`,
      headers: { cookie: admin.cookie }
    });
    expect(adminHistory.statusCode).toBe(200);
    expect(adminHistory.json().total).toBe(1);
    expect(adminHistory.json().items[0].assignment.status).toBe("reassigned");
    expect(JSON.stringify(adminHistory.json())).not.toContain("Rua Secreta");
  });

  it("executa coleta e entrega com códigos de 6 dígitos e registra todas as etapas", async () => {
    const courier = await register("67999908205", "courier", "127.0.0.235");
    const order = await createDelivery();

    const accept = await app.inject({
      method: "POST",
      url: `/api/v1/lily/courier/deliveries/${order.id}/accept`,
      headers: { origin, cookie: courier.cookie, "x-lily-csrf": courier.csrf }
    });
    expect(accept.statusCode).toBe(200);

    async function transition(action: string, code?: string) {
      return app.inject({
        method: "POST",
        url: `/api/v1/lily/courier/deliveries/${order.id}/transition`,
        headers: {
          origin,
          cookie: courier.cookie,
          "x-lily-csrf": courier.csrf
        },
        payload: {
          action,
          ...(code ? { code } : {})
        }
      });
    }

    const arrivedPickup = await transition("arrived_pickup");
    expect(arrivedPickup.statusCode).toBe(200);
    expect(arrivedPickup.json().deliveryStatus).toBe("courier_arrived_pickup");

    const pickupCode = lilyOrderSecurityCode(order.id, "pickup");
    const wrongPickupCode = pickupCode === "000000" ? "000001" : "000000";
    const wrongPickup = await transition("confirm_pickup", wrongPickupCode);
    expect(wrongPickup.statusCode).toBe(401);
    expect(wrongPickup.json().details.code).toBe("LILY_PICKUP_CODE_INVALID");

    const picked = await transition("confirm_pickup", pickupCode);
    expect(picked.statusCode).toBe(200);
    expect(picked.json().deliveryStatus).toBe("picked_up");

    const leftPickup = await transition("left_pickup");
    expect(leftPickup.statusCode).toBe(200);
    expect(leftPickup.json().deliveryStatus).toBe("left_pickup");

    const arrivedDelivery = await transition("arrived_delivery");
    expect(arrivedDelivery.statusCode).toBe(200);
    expect(arrivedDelivery.json().deliveryStatus).toBe("courier_arrived_delivery");

    const deliveryCode = lilyOrderSecurityCode(order.id, "delivery");
    const wrongDeliveryCode = deliveryCode === "999999" ? "999998" : "999999";
    const wrongDelivery = await transition("confirm_delivery", wrongDeliveryCode);
    expect(wrongDelivery.statusCode).toBe(401);
    expect(wrongDelivery.json().details.code).toBe("LILY_DELIVERY_CODE_INVALID");

    const delivered = await transition("confirm_delivery", deliveryCode);
    expect(delivered.statusCode).toBe(200);
    expect(delivered.json().deliveryStatus).toBe("delivered");

    const leftDelivery = await transition("left_delivery");
    expect(leftDelivery.statusCode).toBe(200);
    expect(leftDelivery.json().deliveryStatus).toBe("left_delivery");

    const stored = await lilyPrisma.lilyOrder.findUnique({
      where: { id: order.id },
      include: { deliveryEvents: { orderBy: { createdAt: "asc" } } }
    });
    expect(stored?.completedAt).not.toBeNull();
    const failedAttempts = await lilyPrisma.lilyAdminAudit.findMany({
      where: {
        actorUserId: courier.user.id,
        action: { in: ["delivery.pickup_code_failed", "delivery.delivery_code_failed"] }
      }
    });
    expect(failedAttempts).toHaveLength(2);

    expect(stored?.deliveryEvents.map((event) => event.toStatus)).toEqual([
      "waiting_courier",
      "courier_accepted",
      "courier_arrived_pickup",
      "picked_up",
      "left_pickup",
      "courier_arrived_delivery",
      "delivered",
      "left_delivery"
    ]);

    const completedAssignment = await lilyPrisma.lilyDeliveryAssignment.findFirst({
      where: { orderId: order.id, courierUserId: courier.user.id }
    });
    expect(completedAssignment).toMatchObject({
      status: "completed",
      endReason: "completed"
    });
    expect(completedAssignment?.endedAt).not.toBeNull();

    const history = await app.inject({
      method: "GET",
      url: "/api/v1/lily/courier/deliveries/history?status=completed&page=1&limit=10",
      headers: { cookie: courier.cookie }
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().total).toBe(1);
    expect(history.json().items[0].delivery.id).toBe(order.id);
    expect(JSON.stringify(history.json())).not.toContain("Rua Secreta");
  });
});
