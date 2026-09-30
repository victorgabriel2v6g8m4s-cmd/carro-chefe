import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";
const fullWeek = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, opensAt: "00:00", closesAt: "23:59" }));

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register(phone: string, role: "customer" | "staff" = "customer") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: "senha-cooklily-entrega-06",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const userId = response.json().user.id;
  if (role === "staff") {
    await lilyPrisma.lilyUser.update({
      where: { id: userId },
      data: { role: "staff", mfaEnabled: true }
    });
    await lilyPrisma.lilySession.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: new Date() }
    });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  expect(me.statusCode).toBe(200);
  return { cookie, csrf: me.json().csrfToken, user: me.json().user };
}

async function withBuilderCombo<T>(callback: () => Promise<T>) {
  const combo = await lilyPrisma.lilyCombo.findUnique({ where: { id: "combo-dupla-lily" } });
  if (!combo) throw new Error("combo-dupla-lily ausente no fixture");
  const originalRules = combo.rulesJson;
  const rules = JSON.parse(originalRules);
  await lilyPrisma.lilyCombo.update({
    where: { id: combo.id },
    data: { rulesJson: JSON.stringify({ ...rules, mode: "builder" }) }
  });
  try {
    return await callback();
  } finally {
    await lilyPrisma.lilyCombo.update({
      where: { id: combo.id },
      data: { rulesJson: originalRules }
    });
  }
}

async function resetOrders() {
  await lilyPrisma.lilyOrderItemAddon.deleteMany();
  await lilyPrisma.lilyOrderItem.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAddress.deleteMany();
  await lilyPrisma.lilyDeliveryZone.deleteMany();
}

async function resetUsers() {
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

async function enableFlatOperation() {
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      ordersEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      minimumOrderCents: 1000,
      deliveryStrategy: "flat",
      flatDeliveryFeeCents: 500,
      pickupAddressText: "Retirada CookLily",
      pickupInstructions: "Apresente o número do pedido.",
      businessHoursJson: JSON.stringify(fullWeek),
      timezone: "America/Campo_Grande"
    },
    create: {
      id: "default",
      ordersEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      minimumOrderCents: 1000,
      deliveryStrategy: "flat",
      flatDeliveryFeeCents: 500,
      pickupAddressText: "Retirada CookLily",
      pickupInstructions: "Apresente o número do pedido.",
      businessHoursJson: JSON.stringify(fullWeek),
      timezone: "America/Campo_Grande"
    }
  });
}

async function quoteSol(fulfillmentType: "pickup" | "delivery" = "pickup", address?: Record<string, unknown>) {
  return app.inject({
    method: "POST",
    url: "/api/v1/lily/orders/quote",
    payload: {
      fulfillmentType,
      ...(address ? { address } : {}),
      items: [{
        productId: "prod-acai-sol-lily",
        sizeMl: 300,
        flavorIds: [],
        addons: [],
        quantity: 1
      }]
    }
  });
}

function deliveryAddress(neighborhood = "Centro") {
  return {
    postalCode: "79002000",
    street: "Rua Teste",
    number: "123",
    complement: null,
    neighborhood,
    city: "Campo Grande",
    state: "MS",
    reference: null
  };
}

async function createPayloadFromQuote(quote: ReturnType<typeof JSON.parse>, phone = "67999991111") {
  return {
    phone,
    fulfillmentType: "pickup",
    items: [{
      productId: "prod-acai-sol-lily",
      sizeMl: 300,
      flavorIds: [],
      addons: [],
      quantity: 1,
      note: null,
      configurationHash: quote.items[0].configurationHash,
      expectedUnitPriceCents: quote.items[0].totalPriceCents
    }],
    attribution: { la_campaign: "entrega-06-test" }
  };
}

beforeEach(async () => {
  await resetOrders();
  await resetUsers();
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      ordersEnabled: false,
      pickupEnabled: false,
      deliveryEnabled: false,
      minimumOrderCents: 0,
      deliveryStrategy: "flat",
      flatDeliveryFeeCents: 0,
      pickupAddressText: null,
      pickupInstructions: null,
      businessHoursJson: "[]",
      timezone: "America/Campo_Grande"
    },
    create: { id: "default" }
  });
  await lilyPrisma.lilyProduct.updateMany({ data: { isAvailable: true } });
  await lilyPrisma.lilyProductVariant.updateMany({ data: { isAvailable: true } });
  await lilyPrisma.lilyProductVariant.update({ where: { id: "var-sol-300" }, data: { priceCents: 1500 } });
});

afterEach(async () => {
  await resetOrders();
  await resetUsers();
  await lilyPrisma.lilyProductVariant.update({ where: { id: "var-sol-300" }, data: { priceCents: 1500 } });
});

afterAll(async () => {
  await app.close();
});

describe("CookLily Entrega 06", () => {
  it("mantém pedidos fechados até configuração operacional explícita", async () => {
    const publicConfig = await app.inject({ method: "GET", url: "/api/v1/lily/public/fulfillment" });
    expect(publicConfig.statusCode).toBe(200);
    expect(publicConfig.json().ordersEnabled).toBe(false);

    const quote = await quoteSol();
    expect(quote.statusCode).toBe(409);
    expect(quote.json().details.code).toBe("LILY_ORDERS_DISABLED");
  });

  it("permite homologação MFA-gated sem abrir pedidos ao público", async () => {
    const staff = await register("67999992021", "staff");
    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        ordersEnabled: false,
        pickupEnabled: true,
        pickupAddressText: "Retirada homologação",
        businessHoursJson: "[]"
      }
    });

    const publicQuote = await quoteSol();
    expect(publicQuote.statusCode).toBe(409);
    expect(publicQuote.json().details.code).toBe("LILY_ORDERS_DISABLED");

    const spoofed = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders/quote",
      headers: { "x-lily-homologation": "1" },
      payload: {
        fulfillmentType: "pickup",
        items: [{
          productId: "prod-acai-sol-lily",
          sizeMl: 300,
          flavorIds: [],
          addons: [],
          quantity: 1
        }]
      }
    });
    expect(spoofed.statusCode).toBe(401);

    const quote = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders/quote",
      headers: { cookie: staff.cookie, "x-lily-homologation": "1" },
      payload: {
        fulfillmentType: "pickup",
        items: [{
          productId: "prod-acai-sol-lily",
          sizeMl: 300,
          flavorIds: [],
          addons: [],
          quantity: 1
        }]
      }
    });
    expect(quote.statusCode).toBe(200);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      remoteAddress: "127.0.0.201",
      headers: {
        origin,
        cookie: staff.cookie,
        "x-lily-csrf": staff.csrf,
        "x-lily-homologation": "1",
        "idempotency-key": "homologation-order-test-0001"
      },
      payload: await createPayloadFromQuote(quote.json(), staff.user.phone)
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().isHomologation).toBe(true);

    const stored = await lilyPrisma.lilyOrder.findUnique({ where: { id: created.json().id } });
    expect(stored?.isHomologation).toBe(true);
    expect(await lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" } }))
      .toMatchObject({ ordersEnabled: false });
  });

  it("protege configuração operacional com staff e CSRF", async () => {
    const staff = await register("67999992001", "staff");

    const rejected = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/fulfillment",
      headers: { origin, cookie: staff.cookie },
      payload: { pickupEnabled: true }
    });
    expect(rejected.statusCode).toBe(403);
    expect(rejected.json().details.code).toBe("LILY_CSRF_REQUIRED");

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/fulfillment",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: {
        ordersEnabled: true,
        pickupEnabled: true,
        pickupAddressText: "Retirada teste",
        businessHours: fullWeek
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().ordersEnabled).toBe(true);
    expect(await lilyPrisma.lilyAdminAudit.count({ where: { entityType: "fulfillment-settings" } })).toBe(1);
  });

  it("separa configurações da loja do domínio de entrega e exige CSRF", async () => {
    const staff = await register("67999992011", "staff");

    const mixed = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/fulfillment",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: { instagramHandle: "nao-deve-entrar-aqui" }
    });
    expect(mixed.statusCode).toBe(400);

    const rejected = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/store-settings",
      headers: { origin, cookie: staff.cookie },
      payload: { instagramHandle: "cooklily.teste" }
    });
    expect(rejected.statusCode).toBe(403);
    expect(rejected.json().details.code).toBe("LILY_CSRF_REQUIRED");

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/admin/store-settings",
      headers: { origin, cookie: staff.cookie, "x-lily-csrf": staff.csrf },
      payload: {
        instagramHandle: "@cooklily.teste",
        whatsappPhone: "+5567999991111",
        publicAddressText: "Rua Loja, 123",
        loyaltyOrderCentsPerPoint: 250,
        loyaltyCampaignBonusPoints: 12,
        loyaltyCouponBonusPoints: 8
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      instagramHandle: "cooklily.teste",
      whatsappPhone: "+5567999991111",
      publicAddressText: "Rua Loja, 123",
      loyaltyOrderCentsPerPoint: 250,
      loyaltyCampaignBonusPoints: 12,
      loyaltyCouponBonusPoints: 8
    });

    const publicConfig = await app.inject({ method: "GET", url: "/api/v1/lily/public/config" });
    expect(publicConfig.statusCode).toBe(200);
    expect(publicConfig.json().social.instagramHandle).toBe("cooklily.teste");
    expect(publicConfig.json().store.address).toBe("Rua Loja, 123");
    expect(await lilyPrisma.lilyAdminAudit.count({ where: { entityType: "store-settings" } })).toBe(1);
  });

  it("recalcula item, pedido mínimo e taxa fixa no servidor", async () => {
    await enableFlatOperation();
    const pickup = await quoteSol("pickup");
    expect(pickup.statusCode).toBe(200);
    expect(pickup.json().subtotalCents).toBe(1500);
    expect(pickup.json().deliveryFeeCents).toBe(0);
    expect(pickup.json().grandTotalCents).toBe(1500);

    const delivery = await quoteSol("delivery", deliveryAddress());
    expect(delivery.statusCode).toBe(200);
    expect(delivery.json().deliveryFeeCents).toBe(500);
    expect(delivery.json().grandTotalCents).toBe(2000);
  });

  it("cria pedido guest com snapshots e replay idempotente", async () => {
    await enableFlatOperation();
    const quoteResponse = await quoteSol();
    expect(quoteResponse.statusCode).toBe(200);
    const payload = await createPayloadFromQuote(quoteResponse.json());
    const key = "cooklily:test:guest:0001";

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: { origin, "idempotency-key": key },
      payload
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().status).toBe("awaiting_payment");
    expect(first.json().items[0].productName).toBe("Sol da Lily");
    expect(first.json().items[0].unitPriceCents).toBe(1500);

    const replay = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: { origin, "idempotency-key": key },
      payload
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(first.json().id);
    expect(await lilyPrisma.lilyOrder.count()).toBe(1);

    const persisted = await lilyPrisma.lilyOrder.findUnique({ where: { id: first.json().id } });
    expect(persisted?.laCampaign).toBe("entrega-06-test");
  });

  it("congela o snapshot de alergênicos mesmo se o catálogo mudar depois da compra", async () => {
    await enableFlatOperation();
    const product = await lilyPrisma.lilyProduct.findUnique({ where: { id: "prod-acai-sol-lily" } });
    expect(product).toBeTruthy();

    try {
      await lilyPrisma.lilyProduct.update({
        where: { id: product!.id },
        data: {
          allergenReviewStatus: "reviewed",
          allergenContainsJson: JSON.stringify(["milk"]),
          allergenMayContainJson: JSON.stringify(["peanuts"])
        }
      });

      const quoteResponse = await quoteSol();
      expect(quoteResponse.statusCode).toBe(200);
      expect(quoteResponse.json().items[0].allergens.contains.map((item: any) => item.code)).toContain("milk");

      const payload = await createPayloadFromQuote(quoteResponse.json(), "67999991122");
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/lily/orders",
        headers: { origin, "idempotency-key": "cooklily:test:allergen-snapshot:01" },
        payload
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().items[0].allergens.contains.map((item: any) => item.code)).toContain("milk");
      const guestToken = created.json().guestAccessToken;
      expect(typeof guestToken).toBe("string");

      await lilyPrisma.lilyProduct.update({
        where: { id: product!.id },
        data: {
          allergenContainsJson: JSON.stringify(["soy"]),
          allergenMayContainJson: "[]"
        }
      });

      const tracking = await app.inject({
        method: "GET",
        url: `/api/v1/lily/public/orders/${created.json().id}/tracking`,
        headers: { "x-lily-order-token": guestToken }
      });
      expect(tracking.statusCode).toBe(200);
      expect(tracking.json().items[0].allergens.contains.map((item: any) => item.code)).toContain("milk");
      expect(tracking.json().items[0].allergens.contains.map((item: any) => item.code)).not.toContain("soy");

      const stored = await lilyPrisma.lilyOrderItem.findFirst({ where: { orderId: created.json().id } });
      expect(JSON.parse(stored!.allergenSnapshotJson).contains.map((item: any) => item.code)).toContain("milk");
    } finally {
      await lilyPrisma.lilyProduct.update({
        where: { id: product!.id },
        data: {
          allergenReviewStatus: product!.allergenReviewStatus,
          allergenContainsJson: product!.allergenContainsJson,
          allergenMayContainJson: product!.allergenMayContainJson
        }
      });
    }
  });

  it("registra opt-in WhatsApp por pedido e cria a primeira notificação de forma atômica", async () => {
    await enableFlatOperation();
    const quoteResponse = await quoteSol();
    expect(quoteResponse.statusCode).toBe(200);
    const base = await createPayloadFromQuote(quoteResponse.json());
    const payload = { ...base, whatsappUpdatesOptIn: true };

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      remoteAddress: ["127", "0", "0", "247"].join("."),
      headers: {
        origin,
        "idempotency-key": "cooklily:test:whatsapp:optin:01"
      },
      payload
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().whatsappUpdatesOptIn).toBe(true);

    const stored = await lilyPrisma.lilyOrder.findUnique({
      where: { id: created.json().id },
      include: { whatsappNotifications: true }
    });
    expect(stored?.whatsappUpdatesOptIn).toBe(true);
    expect(stored?.whatsappConsentAt).not.toBeNull();
    expect(stored?.whatsappConsentVersion).toBe("2026-09-29");
    expect(stored?.whatsappNotifications).toHaveLength(1);
    expect(stored?.whatsappNotifications[0]).toMatchObject({
      stage: "awaiting_payment",
      status: "pending",
      attempts: 0
    });

    const stopped = await app.inject({
      method: "POST",
      url: `/api/v1/lily/orders/${created.json().id}/whatsapp/opt-out`,
      headers: {
        origin,
        "x-lily-order-token": created.json().guestAccessToken
      }
    });
    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toEqual({ enabled: false });

    const afterOptOut = await lilyPrisma.lilyOrder.findUnique({
      where: { id: created.json().id },
      include: { whatsappNotifications: true }
    });
    expect(afterOptOut?.whatsappUpdatesOptIn).toBe(false);
    expect(afterOptOut?.whatsappNotifications[0]).toMatchObject({
      stage: "awaiting_payment",
      status: "skipped",
      lastErrorCode: "OPT_OUT"
    });
  });

  it("expõe tracking guest somente com capability token válido e minimiza PII", async () => {
    await enableFlatOperation();
    const quoteResponse = await quoteSol("delivery", deliveryAddress());
    expect(quoteResponse.statusCode).toBe(200);
    const basePayload = await createPayloadFromQuote(quoteResponse.json());
    const payload = {
      ...basePayload,
      fulfillmentType: "delivery",
      address: deliveryAddress()
    };

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      remoteAddress: ["127", "0", "0", "245"].join("."),
      headers: {
        origin,
        "idempotency-key": "cooklily:test:guest:tracking:01"
      },
      payload
    });
    expect(created.statusCode).toBe(201);
    const orderId = created.json().id as string;
    const token = created.json().guestAccessToken as string;
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);

    const missing = await app.inject({
      method: "GET",
      url: `/api/v1/lily/public/orders/${orderId}/tracking`
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().details.code).toBe("LILY_GUEST_ORDER_NOT_FOUND");

    const invalid = await app.inject({
      method: "GET",
      url: `/api/v1/lily/public/orders/${orderId}/tracking`,
      headers: { "x-lily-order-token": "A".repeat(43) }
    });
    expect(invalid.statusCode).toBe(404);
    expect(invalid.json().details.code).toBe("LILY_GUEST_ORDER_NOT_FOUND");

    const unknown = await app.inject({
      method: "GET",
      url: "/api/v1/lily/public/orders/unknown-order/tracking",
      headers: { "x-lily-order-token": token }
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().details.code).toBe("LILY_GUEST_ORDER_NOT_FOUND");

    const tracked = await app.inject({
      method: "GET",
      url: `/api/v1/lily/public/orders/${orderId}/tracking`,
      headers: { "x-lily-order-token": token }
    });
    expect(tracked.statusCode).toBe(200);
    expect(tracked.headers["cache-control"]).toContain("no-store");
    expect(tracked.headers["referrer-policy"]).toBe("no-referrer");
    expect(tracked.json()).toMatchObject({
      id: orderId,
      fulfillmentType: "delivery",
      status: "awaiting_payment",
      deliveryStatus: "not_ready"
    });
    expect(tracked.json().deliveryCode).toBeUndefined();

    const serialized = JSON.stringify(tracked.json());
    expect(serialized).not.toContain("Rua Teste");
    expect(serialized).not.toContain("79002000");
    expect(serialized).not.toContain("67999991111");
    expect(serialized).not.toContain("entrega-06-test");
    expect(serialized).not.toContain('"actor"');
    expect(serialized).not.toContain('"note"');
    expect(serialized).not.toContain("configurationHash");

    await lilyPrisma.lilyOrder.update({
      where: { id: orderId },
      data: {
        status: "paid",
        operationStatus: "ready_for_dispatch",
        deliveryStatus: "picked_up",
        deliveryUpdatedAt: new Date()
      }
    });

    const inRoute = await app.inject({
      method: "GET",
      url: `/api/v1/lily/public/orders/${orderId}/tracking`,
      headers: { "x-lily-order-token": token }
    });
    expect(inRoute.statusCode).toBe(200);
    expect(inRoute.json().deliveryCode).toMatch(/^\d{6}$/);

    await lilyPrisma.lilyOrder.update({
      where: { id: orderId },
      data: {
        deliveryStatus: "delivered",
        deliveryUpdatedAt: new Date()
      }
    });
    const delivered = await app.inject({
      method: "GET",
      url: `/api/v1/lily/public/orders/${orderId}/tracking`,
      headers: { "x-lily-order-token": token }
    });
    expect(delivered.statusCode).toBe(200);
    expect(delivered.json().deliveryCode).toBeUndefined();
  });

  it("rejeita reutilização da chave idempotente com pedido diferente", async () => {
    await enableFlatOperation();
    const quoteResponse = await quoteSol();
    const payload = await createPayloadFromQuote(quoteResponse.json());
    const key = "cooklily:test:conflict:0001";

    const first = await app.inject({ method: "POST", url: "/api/v1/lily/orders", headers: { origin, "idempotency-key": key }, payload });
    expect(first.statusCode).toBe(201);

    const conflict = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: { origin, "idempotency-key": key },
      payload: { ...payload, phone: "67999992222" }
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().details.code).toBe("LILY_IDEMPOTENCY_CONFLICT");
  });

  it("rejeita preço stale entre cotação e criação", async () => {
    await enableFlatOperation();
    const quoteResponse = await quoteSol();
    const payload = await createPayloadFromQuote(quoteResponse.json());
    await lilyPrisma.lilyProductVariant.update({ where: { id: "var-sol-300" }, data: { priceCents: 1600 } });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: { origin, "idempotency-key": "cooklily:test:stale-price:01" },
      payload
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().details.code).toBe("LILY_PRICE_CHANGED");
    expect(response.json().details.currentUnitPriceCents).toBe(1600);
    expect(await lilyPrisma.lilyOrder.count()).toBe(0);
  });

  it("calcula entrega por região e rejeita endereço não atendido", async () => {
    await enableFlatOperation();
    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: { deliveryStrategy: "zone", flatDeliveryFeeCents: 0 }
    });
    await lilyPrisma.lilyDeliveryZone.create({
      data: {
        name: "Centro",
        feeCents: 700,
        minimumOrderCents: 1000,
        neighborhoodsJson: JSON.stringify(["Centro"]),
        postalCodePrefixesJson: JSON.stringify(["79002"]),
        status: "active",
        sortOrder: 10
      }
    });

    const served = await quoteSol("delivery", deliveryAddress("Centro"));
    expect(served.statusCode).toBe(200);
    expect(served.json().deliveryFeeCents).toBe(700);
    expect(served.json().fulfillment.deliveryZone.name).toBe("Centro");

    const unserved = await quoteSol("delivery", { ...deliveryAddress("Bairro distante"), postalCode: "79999000" });
    expect(unserved.statusCode).toBe(422);
    expect(unserved.json().details.code).toBe("LILY_DELIVERY_ZONE_NOT_FOUND");
  });

  it("cota e cria combo montável com regra e preço validados no servidor", async () => {
    await withBuilderCombo(async () => {
      await enableFlatOperation();
      const quoteResponse = await app.inject({
        method: "POST",
        url: "/api/v1/lily/orders/quote",
        payload: {
          fulfillmentType: "pickup",
          items: [{
            kind: "combo",
            comboId: "combo-dupla-lily",
            selections: [
              { productId: "prod-ls-morango", sizeMl: 500, flavorIds: ["flv-morango"], addons: [] },
              { productId: "prod-ls-cafe", sizeMl: 500, flavorIds: ["flv-cafe"], addons: [] }
            ],
            quantity: 1
          }]
        }
      });
      expect(quoteResponse.statusCode).toBe(200);
      const quote = quoteResponse.json();
      expect(quote.items[0].kind).toBe("combo");
      expect(quote.items[0].totalPriceCents).toBe(4000);
      expect(quote.items[0].selections).toHaveLength(2);
      expect(quote.subtotalCents).toBe(4000);

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/lily/orders",
        headers: { origin, "idempotency-key": "cooklily:test:combo:valid01" },
        payload: {
          phone: "67999995555",
          fulfillmentType: "pickup",
          items: [{
            kind: "combo",
            comboId: "combo-dupla-lily",
            selections: [
              { productId: "prod-ls-morango", sizeMl: 500, flavorIds: ["flv-morango"], addons: [] },
              { productId: "prod-ls-cafe", sizeMl: 500, flavorIds: ["flv-cafe"], addons: [] }
            ],
            quantity: 1,
            configurationHash: quote.items[0].configurationHash,
            expectedUnitPriceCents: quote.items[0].totalPriceCents
          }]
        }
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().items[0].kind).toBe("combo");
      expect(created.json().items[0].productName).toBe("Dupla Lily");
      expect(created.json().items[0].unitPriceCents).toBe(4000);
      expect(created.json().items[0].configuration.selections).toHaveLength(2);
    });
  });

  it("rejeita produto que não atende às regras do combo montável", async () => {
    await withBuilderCombo(async () => {
      await enableFlatOperation();
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/lily/orders/quote",
        payload: {
          fulfillmentType: "pickup",
          items: [{
            kind: "combo",
            comboId: "combo-dupla-lily",
            selections: [
              { productId: "prod-ls-morango", sizeMl: 500, flavorIds: ["flv-morango"], addons: [] },
              { productId: "prod-ls-nutt-morango", sizeMl: 500, flavorIds: ["flv-morango", "flv-nutella"], addons: [] }
            ],
            quantity: 1
          }]
        }
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().details.code).toBe("LILY_COMBO_SUBTYPE");
    });
  });

  it("isola endereços entre clientes e exige CSRF em mutação", async () => {
    const a = await register("67999993001");
    const b = await register("67999993002");

    const noCsrf = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/addresses",
      headers: { origin, cookie: a.cookie },
      payload: deliveryAddress()
    });
    expect(noCsrf.statusCode).toBe(403);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/addresses",
      headers: { origin, cookie: a.cookie, "x-lily-csrf": a.csrf },
      payload: deliveryAddress()
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().isDefault).toBe(true);

    const otherPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/lily/customer/addresses/${created.json().id}`,
      headers: { origin, cookie: b.cookie, "x-lily-csrf": b.csrf },
      payload: { label: "Não deveria" }
    });
    expect(otherPatch.statusCode).toBe(404);

    const own = await app.inject({ method: "GET", url: "/api/v1/lily/customer/addresses", headers: { cookie: a.cookie } });
    expect(own.statusCode).toBe(200);
    expect(own.json().addresses).toHaveLength(1);
  });

  it("vincula pedido autenticado ao dono, exige CSRF e impede IDOR no histórico", async () => {
    await enableFlatOperation();
    const a = await register("67999994001");
    const b = await register("67999994002");
    const quoteResponse = await quoteSol();
    const payload = await createPayloadFromQuote(quoteResponse.json(), a.user.phone);

    const noCsrf = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: { origin, cookie: a.cookie, "idempotency-key": "cooklily:test:auth:nocsrf" },
      payload
    });
    expect(noCsrf.statusCode).toBe(403);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/orders",
      headers: {
        origin,
        cookie: a.cookie,
        "x-lily-csrf": a.csrf,
        "idempotency-key": "cooklily:test:auth:owner01"
      },
      payload
    });
    expect(created.statusCode).toBe(201);

    const ownList = await app.inject({ method: "GET", url: "/api/v1/lily/customer/orders", headers: { cookie: a.cookie } });
    expect(ownList.statusCode).toBe(200);
    expect(ownList.json().orders).toHaveLength(1);

    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/lily/customer/orders/${created.json().id}`,
      headers: { cookie: b.cookie }
    });
    expect(denied.statusCode).toBe(404);
  });
});
