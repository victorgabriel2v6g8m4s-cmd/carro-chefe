import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import {
  LILY_PRIVACY_VERSION,
  LILY_TERMS_VERSION
} from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

beforeEach(async () => {
  await lilyPrisma.lilyMarketingLead.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
});

afterAll(async () => {
  await app.close();
});

describe("Lily auth", () => {
  it("mantém health separado e banco acessível", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "lily-acai" });
  });

  it("não aceita sessão externa ou arbitrária como sessão Lily", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/me",
      headers: { cookie: "lily_session=carro-chefe-session-arbitraria" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().details.code).toBe("LILY_SESSION_INVALID");
  });

  it("cadastra customer com consentimentos opcionais recusados", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/register",
      headers: { origin },
      payload: {
        phone: "(67) 99928-9187",
        password: "senha-lily-segura-2026",
        displayName: "Cliente Lily",
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
    expect(response.json().user.role).toBe("customer");
    expect(response.json().consents.share_with_carro_chefe.granted).toBe(false);
    expect(response.json().consents.analytics_optional.granted).toBe(false);
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.json()).not.toHaveProperty("passwordHash");
  });

  it("rejeita telefone duplicado e credencial errada", async () => {
    const payload = {
      phone: "67999289187",
      password: "senha-lily-segura-2026",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    };
    const first = await app.inject({ method: "POST", url: "/api/v1/lily/auth/register", headers: { origin }, payload });
    expect(first.statusCode).toBe(201);
    const duplicate = await app.inject({ method: "POST", url: "/api/v1/lily/auth/register", headers: { origin }, payload });
    expect(duplicate.statusCode).toBe(409);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/login",
      headers: { origin },
      payload: { phone: payload.phone, password: "senha-errada-123" }
    });
    expect(login.statusCode).toBe(401);
  });

  it("autentica, rotaciona CSRF em me e exige CSRF no logout", async () => {
    const register = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/register",
      headers: { origin },
      payload: {
        phone: "67999289187",
        password: "senha-lily-segura-2026",
        termsAccepted: true,
        termsVersion: LILY_TERMS_VERSION,
        privacyPolicyVersion: LILY_PRIVACY_VERSION,
        consents: { lilyMarketing: true, shareWithCarroChefe: false, analyticsOptional: false }
      }
    });
    const cookie = cookieFrom(register);
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/me",
      headers: { cookie }
    });
    expect(me.statusCode).toBe(200);
    const csrfToken = me.json().csrfToken;
    expect(typeof csrfToken).toBe("string");

    const rejected = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/logout",
      headers: { origin, cookie }
    });
    expect(rejected.statusCode).toBe(403);

    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/logout",
      headers: { origin, cookie, "x-lily-csrf": csrfToken }
    });
    expect(logout.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/me",
      headers: { cookie }
    });
    expect(after.statusCode).toBe(401);
  });

  it("exige pelo menos 12 caracteres em novos cadastros", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/register",
      headers: { origin },
      payload: {
        phone: "67999289188",
        password: "12345678901",
        termsAccepted: true,
        termsVersion: LILY_TERMS_VERSION,
        privacyPolicyVersion: LILY_PRIVACY_VERSION,
        consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
      }
    });
    expect(response.statusCode).toBe(400);
  });

});
