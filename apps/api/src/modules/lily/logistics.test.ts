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

    const wrongPickup = await transition("confirm_pickup", "000000");
    if (lilyOrderSecurityCode(order.id, "pickup") !== "000000") {
      expect(wrongPickup.statusCode).toBe(401);
      expect(wrongPickup.json().details.code).toBe("LILY_PICKUP_CODE_INVALID");
    }

    const picked = await transition("confirm_pickup", lilyOrderSecurityCode(order.id, "pickup"));
    expect(picked.statusCode).toBe(200);
    expect(picked.json().deliveryStatus).toBe("picked_up");

    const leftPickup = await transition("left_pickup");
    expect(leftPickup.statusCode).toBe(200);
    expect(leftPickup.json().deliveryStatus).toBe("left_pickup");

    const arrivedDelivery = await transition("arrived_delivery");
    expect(arrivedDelivery.statusCode).toBe(200);
    expect(arrivedDelivery.json().deliveryStatus).toBe("courier_arrived_delivery");

    const wrongDelivery = await transition("confirm_delivery", "999999");
    if (lilyOrderSecurityCode(order.id, "delivery") !== "999999") {
      expect(wrongDelivery.statusCode).toBe(401);
      expect(wrongDelivery.json().details.code).toBe("LILY_DELIVERY_CODE_INVALID");
    }

    const delivered = await transition("confirm_delivery", lilyOrderSecurityCode(order.id, "delivery"));
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
  });
});
