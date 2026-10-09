import crypto from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@lily-acai/database", () => ({
  lilyPrisma: { lilyWhatsAppWebhookEvent: { upsert } }
}));

import { protectSensitiveMutation } from "../../security/request-trust";
import { integrationWhatsAppWebhookRoutes } from "./whatsapp-webhooks";

const envNames = [
  "COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "COOKLILY_WHATSAPP_APP_SECRET",
  "CARRO_CHEFE_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "CARRO_CHEFE_WHATSAPP_APP_SECRET"
] as const;
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
let app: FastifyInstance;

function sign(body: string, secret: string) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

beforeEach(async () => {
  process.env.COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN = "cooklily-verify-test";
  process.env.COOKLILY_WHATSAPP_APP_SECRET = "cooklily-app-secret-test";
  process.env.CARRO_CHEFE_WHATSAPP_WEBHOOK_VERIFY_TOKEN = "carro-chefe-verify-test";
  process.env.CARRO_CHEFE_WHATSAPP_APP_SECRET = "carro-chefe-app-secret-test";
  upsert.mockReset().mockResolvedValue({});
  app = Fastify({ trustProxy: true });
  app.addHook("onRequest", protectSensitiveMutation);
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    request.rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch {
      done(new Error("invalid JSON"), undefined);
    }
  });
  await app.register(integrationWhatsAppWebhookRoutes);
});

afterEach(async () => {
  await app.close();
  for (const name of envNames) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("isolated WhatsApp integration webhooks", () => {
  it("verifies each GET endpoint only with its own token", async () => {
    const cooklily = await app.inject({
      method: "GET",
      url: "/api/v1/integrations/cooklily/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=cooklily-verify-test&hub.challenge=challenge-cl"
    });
    expect(cooklily.statusCode).toBe(200);
    expect(cooklily.body).toBe("challenge-cl");

    const carroChefe = await app.inject({
      method: "GET",
      url: "/api/v1/integrations/carro-chefe/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=carro-chefe-verify-test&hub.challenge=challenge-cc"
    });
    expect(carroChefe.statusCode).toBe(200);
    expect(carroChefe.body).toBe("challenge-cc");

    const crossTenant = await app.inject({
      method: "GET",
      url: "/api/v1/integrations/carro-chefe/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=cooklily-verify-test&hub.challenge=bad"
    });
    expect(crossTenant.statusCode).toBe(403);
  });

  it("requires the correct Carro Chefe signature and acknowledges verified events", async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: "wamid-cc" }] } }] }]
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/carro-chefe/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", "x-hub-signature-256": sign(body, "wrong-secret") },
      payload: body
    });
    expect(invalid.statusCode).toBe(401);

    const valid = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/carro-chefe/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", "x-hub-signature-256": sign(body, "carro-chefe-app-secret-test") },
      payload: body
    });
    expect(valid.statusCode).toBe(200);
    expect(valid.json()).toEqual({ received: true, events: 1 });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("preserves CookLily's hashed, deduplicated event persistence", async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: "wamid-cl", text: { body: "private text" } }] } }] }]
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/cooklily/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", "x-hub-signature-256": sign(body, "cooklily-app-secret-test") },
      payload: body
    });
    expect(response.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
    const create = (upsert.mock.calls[0]![0] as { create: Record<string, unknown> }).create;
    expect(create.eventType).toBe("message.received");
    expect(create.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(create)).not.toContain("private text");
  });

  it("fails closed when the integration app secret is missing", async () => {
    delete process.env.CARRO_CHEFE_WHATSAPP_APP_SECRET;
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/carro-chefe/whatsapp/webhook",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      payload: "{}"
    });
    expect(response.statusCode).toBe(503);
  });
});
