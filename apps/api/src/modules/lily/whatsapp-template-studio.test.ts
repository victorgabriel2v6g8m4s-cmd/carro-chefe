import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";
const createdTemplateKeys: string[] = [];
let createdUserId = "";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function registerAdmin() {
  const phone = `679${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  const response = await app.inject({
    method: "POST", url: "/api/v1/lily/auth/register", headers: { origin },
    payload: {
      phone, password: "senha-template-studio-2026", termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION, privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode, JSON.stringify(response.json())).toBe(201);
  const cookie = cookieFrom(response);
  createdUserId = response.json().user.id;
  await lilyPrisma.lilyUser.update({ where: { id: createdUserId }, data: { role: "admin", mfaEnabled: true, staffPasswordUpgradeRequired: false } });
  await lilyPrisma.lilySession.updateMany({ where: { userId: createdUserId }, data: { mfaVerifiedAt: new Date() } });
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { cookie, csrf: me.json().csrfToken };
}

afterEach(async () => {
  if (createdTemplateKeys.length) {
    await lilyPrisma.lilyAdminAudit.deleteMany({ where: { entityId: { in: createdTemplateKeys } } });
    await lilyPrisma.lilyWhatsAppMessageTemplate.deleteMany({ where: { key: { in: createdTemplateKeys } } });
    createdTemplateKeys.length = 0;
  }
  if (createdUserId) {
    await lilyPrisma.lilySession.deleteMany({ where: { userId: createdUserId } });
    await lilyPrisma.lilyConsentRecord.deleteMany({ where: { userId: createdUserId } });
    await lilyPrisma.lilyUser.delete({ where: { id: createdUserId } });
    createdUserId = "";
  }
  await lilyPrisma.lilyWhatsAppSimulatorSettings.deleteMany({ where: { id: "default" } });
});

afterAll(async () => app.close());

describe("CookLily WhatsApp template studio API", () => {
  it("persists, returns and edits complete Meta component arrays", async () => {
    const auth = await registerAdmin();
    const key = `test_template_studio_${Date.now()}`;
    createdTemplateKeys.push(key);
    const components = [
      { type: "HEADER", format: "IMAGE" },
      { type: "BODY", text: "Pedido {{1}} pronto", example: { body_text: [["CL-2048"]] } },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Acompanhar" }] }
    ];
    const created = await app.inject({
      method: "POST", url: "/api/v1/lily/admin/whatsapp/templates",
      headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf },
      payload: {
        key, displayName: "Pedido pronto", category: "utility", language: "pt_BR",
        bodyTemplate: "Pedido {{1}} pronto", variables: [], variableNames: ["numero_do_pedido"], metaTemplateName: null,
        components, status: "draft"
      }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().template.components).toEqual(components);
    expect(created.json().template.variableNames).toEqual(["numero_do_pedido"]);

    const listed = await app.inject({ method: "GET", url: "/api/v1/lily/admin/whatsapp/templates?limit=100", headers: { cookie: auth.cookie } });
    expect(listed.statusCode).toBe(200);
    const stored = listed.json().templates.find((item: { key: string }) => item.key === key);
    expect(stored.components).toEqual(components);
    expect(stored.variableNames).toEqual(["numero_do_pedido"]);
    const nodes = [{ id: "start", name: "Boas-vindas", trigger: "início", templateKey: key, response: "", nextNodeId: "", branches: [{ id: "track", trigger: "botão", response: "Acompanhar", nextNodeId: "status" }] }, { id: "status", name: "Status", trigger: "manual", templateKey: key, response: "", nextNodeId: "" }];
    const savedFlow = await app.inject({ method: "PUT", url: `/api/v1/lily/admin/whatsapp/templates/${key}/flow`, headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf }, payload: nodes });
    expect(savedFlow.statusCode).toBe(200);
    expect(savedFlow.json().nodes).toEqual(nodes);
    const pricing = { usdToBrl: 5.3, usd: { marketing: 0.06, utility: 0.007, authentication: 0.007, service: 0.007 }, freeServiceMessages: 1000, effectiveDate: "2026-10-01", source: "test" };
    const savedPricing = await app.inject({ method: "PUT", url: "/api/v1/lily/admin/whatsapp/simulator", headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf }, payload: { pricing } });
    expect(savedPricing.statusCode).toBe(200);
    const simulator = await app.inject({ method: "GET", url: "/api/v1/lily/admin/whatsapp/simulator", headers: { cookie: auth.cookie } });
    expect(simulator.json()).toMatchObject({ pricing, flows: { [key]: nodes } });

    const updatedComponents = [{ type: "BODY", text: "Seu pedido {{1}} foi entregue." }, { type: "FOOTER", text: "CookLily" }];
    const updated = await app.inject({
      method: "PATCH", url: `/api/v1/lily/admin/whatsapp/templates/${created.json().template.id}`,
      headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf },
      payload: { components: updatedComponents, bodyTemplate: "Seu pedido {{1}} foi entregue.", variableNames: ["codigo_de_rastreio"], status: "draft" }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().template.components).toEqual(updatedComponents);
    expect(updated.json().template.variableNames).toEqual(["codigo_de_rastreio"]);
  });

  it("rejects malformed or oversized advanced components", async () => {
    const auth = await registerAdmin();
    const response = await app.inject({
      method: "POST", url: "/api/v1/lily/admin/whatsapp/templates",
      headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf },
      payload: {
        key: `test_template_studio_bad_${Date.now()}`, displayName: "Template inválido",
        category: "marketing", language: "pt_BR", bodyTemplate: "Teste", variables: [],
        components: [{ text: "sem type" }], status: "draft"
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("instala idempotentemente os rascunhos de atendimento sem submeter nada à Meta", async () => {
    const auth = await registerAdmin();
    const first = await app.inject({ method: "POST", url: "/api/v1/lily/admin/whatsapp/templates/starter-pack", headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf }, payload: {} });
    expect(first.statusCode).toBe(200);
    const pack = first.json();
    createdTemplateKeys.push(...pack.createdKeys);
    expect(pack).toMatchObject({ created: 16, existing: 0, total: 16 });
    const listed = await app.inject({ method: "GET", url: "/api/v1/lily/admin/whatsapp/templates?limit=100", headers: { cookie: auth.cookie } });
    const verification = listed.json().templates.find((item: { key: string }) => item.key === "account_verification_code");
    expect(verification).toMatchObject({ category: "authentication", status: "draft" });
    expect(verification.components.find((item: { type: string }) => item.type === "BUTTONS").buttons[0]).toMatchObject({ type: "OTP", otp_type: "COPY_CODE" });
    const second = await app.inject({ method: "POST", url: "/api/v1/lily/admin/whatsapp/templates/starter-pack", headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf }, payload: {} });
    expect(second.json()).toMatchObject({ created: 0, existing: 16, total: 16 });
  });
});
