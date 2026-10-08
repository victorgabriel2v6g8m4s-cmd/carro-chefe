import { afterEach, describe, expect, it, vi } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import {
  enqueueLilyWhatsAppStage,
  lilyWhatsAppConfiguration,
  processLilyWhatsAppQueue
} from "./whatsapp";

const envNames = [
  "COOKLILY_WHATSAPP_PROVIDER",
  "COOKLILY_WHATSAPP_ACCESS_TOKEN",
  "COOKLILY_WHATSAPP_PHONE_NUMBER_ID",
  "COOKLILY_WHATSAPP_GRAPH_VERSION",
  "COOKLILY_WHATSAPP_TEMPLATE_NAME",
  "COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE"
] as const;

const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
const createdOrderIds: string[] = [];
const createdUserIds: string[] = [];

function configureMeta() {
  process.env.COOKLILY_WHATSAPP_PROVIDER = "meta_cloud";
  process.env.COOKLILY_WHATSAPP_ACCESS_TOKEN = "meta-secret-test-token";
  process.env.COOKLILY_WHATSAPP_PHONE_NUMBER_ID = "123456789";
  process.env.COOKLILY_WHATSAPP_GRAPH_VERSION = "v99.0";
  process.env.COOKLILY_WHATSAPP_TEMPLATE_NAME = "cooklily_order_update";
  process.env.COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE = "pt_BR";
}

async function createOrder(optedIn = true, userId?: string) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const order = await lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `CL-WA-${suffix}`,
      idempotencyKey: `cooklily:wa:test:${suffix}`,
      requestFingerprint: `fingerprint-${suffix}`,
      phoneNormalized: "+5567999999999",
      userId,
      fulfillmentType: "pickup",
      status: "awaiting_payment",
      operationStatus: "received",
      deliveryStatus: "not_applicable",
      deliveryUpdatedAt: new Date(),
      subtotalCents: 2500,
      deliveryFeeCents: 0,
      discountTotalCents: 0,
      grandTotalCents: 2500,
      whatsappUpdatesOptIn: optedIn,
      whatsappConsentAt: optedIn ? new Date() : null,
      whatsappConsentVersion: optedIn ? "2026-09-29" : null
    }
  });
  createdOrderIds.push(order.id);
  return order;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  for (const name of envNames) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  if (createdOrderIds.length) {
    await lilyPrisma.lilyWhatsAppNotification.deleteMany({
      where: { orderId: { in: [...createdOrderIds] } }
    });
    await lilyPrisma.lilyOrder.deleteMany({
      where: { id: { in: [...createdOrderIds] } }
    });
    createdOrderIds.length = 0;
  }
  if (createdUserIds.length) {
    await lilyPrisma.lilyConsentRecord.deleteMany({ where: { userId: { in: [...createdUserIds] } } });
    await lilyPrisma.lilyUser.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.length = 0;
  }
});

describe("CookLily Entrega 11H WhatsApp", () => {
  it("fica fail-closed enquanto Meta Cloud API não estiver completamente configurada", () => {
    delete process.env.COOKLILY_WHATSAPP_PROVIDER;
    delete process.env.COOKLILY_WHATSAPP_ACCESS_TOKEN;
    delete process.env.COOKLILY_WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.COOKLILY_WHATSAPP_GRAPH_VERSION;
    delete process.env.COOKLILY_WHATSAPP_TEMPLATE_NAME;

    expect(lilyWhatsAppConfiguration()).toMatchObject({
      provider: "disabled",
      supported: true,
      ready: false,
      accessTokenConfigured: false,
      phoneNumberIdConfigured: false,
      graphVersionConfigured: false,
      templateConfigured: false
    });
  });

  it("enfileira cada etapa no máximo uma vez e ignora pedido sem opt-in", async () => {
    const opted = await createOrder(true);
    const optedOut = await createOrder(false);

    await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: opted.id,
      optedIn: true,
      stage: "preparing"
    });
    await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: opted.id,
      optedIn: true,
      stage: "preparing"
    });
    await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: optedOut.id,
      optedIn: false,
      stage: "preparing"
    });

    expect(await lilyPrisma.lilyWhatsAppNotification.count({
      where: { orderId: opted.id, stage: "preparing" }
    })).toBe(1);
    expect(await lilyPrisma.lilyWhatsAppNotification.count({
      where: { orderId: optedOut.id }
    })).toBe(0);
  });

  it("respeita opt-out de atualizações do WhatsApp salvo nas preferências da conta", async () => {
    configureMeta();
    const phoneSuffix = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const user = await lilyPrisma.lilyUser.create({
      data: {
        phoneNormalized: `+5567${Date.now().toString().slice(-7)}${phoneSuffix}`,
        passwordHash: "test-hash",
        displayName: "Cliente Opt-out",
        role: "customer",
        status: "active"
      }
    });
    createdUserIds.push(user.id);
    await lilyPrisma.lilyConsentRecord.create({
      data: {
        userId: user.id,
        purpose: "whatsapp_order_updates",
        version: "2026-10-08",
        granted: false,
        source: "profile_settings"
      }
    });
    const order = await createOrder(true, user.id);
    const notification = await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: order.id,
      optedIn: true,
      stage: "preparing"
    });
    vi.stubGlobal("fetch", vi.fn());

    await processLilyWhatsAppQueue(10);
    const stored = await lilyPrisma.lilyWhatsAppNotification.findUnique({ where: { id: notification!.id } });
    expect(stored?.status).toBe("skipped");
    expect(stored?.lastErrorCode).toBe("OPT_OUT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("envia template utilitário pelo endpoint Meta sem colocar token na URL ou persistir segredo", async () => {
    configureMeta();
    const order = await createOrder(true);
    const notification = await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: order.id,
      optedIn: true,
      stage: "out_for_delivery"
    });
    expect(notification).not.toBeNull();

    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({
        messaging_product: "whatsapp",
        messages: [{ id: "wamid.test-123" }]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await processLilyWhatsAppQueue(10);
    expect(result.sent).toBeGreaterThanOrEqual(1);

    const stored = await lilyPrisma.lilyWhatsAppNotification.findUnique({
      where: { id: notification!.id }
    });
    expect(stored).toMatchObject({
      status: "sent",
      provider: "meta_cloud",
      providerMessageId: "wamid.test-123",
      attempts: 1
    });
    expect(stored?.sentAt).not.toBeNull();

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://graph.facebook.com/v99.0/123456789/messages");
    expect(calls[0]!.url).not.toContain("meta-secret-test-token");
    expect((calls[0]!.init?.headers as Record<string, string>).Authorization)
      .toBe("Bearer meta-secret-test-token");

    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.to).toBe("5567999999999");
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("cooklily_order_update");
    expect(body.template.language.code).toBe("pt_BR");
    expect(body.template.components[0].parameters[0].text).toBe(order.orderNumber);
    expect(body.template.components[0].parameters[1].text).toContain("saiu para entrega");

    const persisted = JSON.stringify(stored);
    expect(persisted).not.toContain("meta-secret-test-token");
  });

  it("falha de provider agenda retry sem alterar estado do pedido", async () => {
    configureMeta();
    const order = await createOrder(true);
    const notification = await enqueueLilyWhatsAppStage(lilyPrisma, {
      orderId: order.id,
      optedIn: true,
      stage: "payment_confirmed"
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: { code: 131000, message: "Temporary provider error" }
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    })));

    const before = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    const result = await processLilyWhatsAppQueue(10);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const stored = await lilyPrisma.lilyWhatsAppNotification.findUnique({
      where: { id: notification!.id }
    });
    expect(stored?.status).toBe("failed");
    expect(stored?.attempts).toBe(1);
    expect(stored?.lastErrorCode).toBe("131000");
    expect(stored?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    const after = await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } });
    expect(after?.status).toBe(before?.status);
    expect(after?.operationStatus).toBe(before?.operationStatus);
  });
});
