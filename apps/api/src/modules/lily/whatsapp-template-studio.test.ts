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
        bodyTemplate: "Pedido {{1}} pronto", variables: [], metaTemplateName: null,
        components, status: "draft"
      }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().template.components).toEqual(components);

    const listed = await app.inject({ method: "GET", url: "/api/v1/lily/admin/whatsapp/templates?limit=100", headers: { cookie: auth.cookie } });
    expect(listed.statusCode).toBe(200);
    const stored = listed.json().templates.find((item: { key: string }) => item.key === key);
    expect(stored.components).toEqual(components);

    const updatedComponents = [{ type: "BODY", text: "Seu pedido {{1}} foi entregue." }, { type: "FOOTER", text: "CookLily" }];
    const updated = await app.inject({
      method: "PATCH", url: `/api/v1/lily/admin/whatsapp/templates/${created.json().template.id}`,
      headers: { cookie: auth.cookie, origin, "x-lily-csrf": auth.csrf },
      payload: { components: updatedComponents, bodyTemplate: "Seu pedido {{1}} foi entregue.", status: "draft" }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().template.components).toEqual(updatedComponents);
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
});
