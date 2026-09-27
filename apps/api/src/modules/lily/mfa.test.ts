import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { currentLilyTotp } from "./mfa";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function registerAdmin() {
  const password = "senha-admin-mfa-2026";
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone: "67999908001",
      password,
      displayName: "Admin MFA",
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const userId = response.json().user.id;
  await lilyPrisma.lilyUser.update({
    where: { id: userId },
    data: { role: "admin", staffPasswordUpgradeRequired: false }
  });
  const cookie = cookieFrom(response);
  const me = await app.inject({
    method: "GET",
    url: "/api/v1/lily/auth/me",
    headers: { cookie }
  });
  expect(me.statusCode).toBe(200);
  return { userId, password, cookie, csrf: me.json().csrfToken };
}

async function loginAdmin(password: string) {
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/login",
    headers: { origin },
    payload: { phone: "67999908001", password }
  });
  expect(login.statusCode).toBe(200);
  const cookie = cookieFrom(login);
  const me = await app.inject({
    method: "GET",
    url: "/api/v1/lily/auth/me",
    headers: { cookie }
  });
  expect(me.statusCode).toBe(200);
  return { login, cookie, csrf: me.json().csrfToken };
}

async function cleanup() {
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

describe("CookLily MFA staff/admin", () => {
  it("bloqueia painel privilegiado até configurar e confirmar TOTP", async () => {
    const admin = await registerAdmin();

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: admin.cookie }
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().details.code).toBe("LILY_STAFF_MFA_SETUP_REQUIRED");

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/setup",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { currentPassword: "senha-incorreta" }
    });
    expect(wrongPassword.statusCode).toBe(401);

    const setup = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/setup",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { currentPassword: admin.password }
    });
    expect(setup.statusCode).toBe(200);
    const secret = setup.json().secret as string;
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(setup.json().otpauthUri).toContain("otpauth://totp/");

    const beforeConfirm = await lilyPrisma.lilyUser.findUnique({ where: { id: admin.userId } });
    expect(beforeConfirm?.mfaSecretEncrypted).toBeTruthy();
    expect(beforeConfirm?.mfaSecretEncrypted).not.toContain(secret);
    expect(beforeConfirm?.mfaEnabled).toBe(false);

    const confirm = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/confirm",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { code: currentLilyTotp(secret) }
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().recoveryCodes).toHaveLength(8);
    const recoveryCode = confirm.json().recoveryCodes[0] as string;

    const stored = await lilyPrisma.lilyUser.findUnique({ where: { id: admin.userId } });
    expect(stored?.mfaEnabled).toBe(true);
    expect(stored?.mfaRecoveryCodesJson).not.toContain(recoveryCode);

    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: admin.cookie }
    });
    expect(allowed.statusCode).toBe(200);
  });

  it("exige segundo fator a cada nova sessão privilegiada e consome recovery code uma vez", async () => {
    const admin = await registerAdmin();
    const setup = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/setup",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { currentPassword: admin.password }
    });
    const secret = setup.json().secret as string;
    const confirm = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/confirm",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { code: currentLilyTotp(secret) }
    });
    const recoveryCode = confirm.json().recoveryCodes[0] as string;

    const second = await loginAdmin(admin.password);
    expect(second.login.json().mfa).toEqual({
      required: true,
      enabled: true,
      verified: false,
      setupRequired: false
    });

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: second.cookie }
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().details.code).toBe("LILY_STAFF_MFA_REQUIRED");

    const verified = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/verify",
      headers: { origin, cookie: second.cookie, "x-lily-csrf": second.csrf },
      payload: { code: recoveryCode }
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().method).toBe("recovery");
    expect(verified.json().recoveryCodesRemaining).toBe(7);

    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: second.cookie }
    });
    expect(allowed.statusCode).toBe(200);

    const third = await loginAdmin(admin.password);
    const reused = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/verify",
      headers: { origin, cookie: third.cookie, "x-lily-csrf": third.csrf },
      payload: { code: recoveryCode }
    });
    expect(reused.statusCode).toBe(401);
    expect(reused.json().details.code).toBe("LILY_MFA_CODE_INVALID");

    const totp = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/mfa/verify",
      headers: { origin, cookie: third.cookie, "x-lily-csrf": third.csrf },
      payload: { code: currentLilyTotp(secret) }
    });
    expect(totp.statusCode).toBe(200);
    expect(totp.json().method).toBe("totp");
  });

  it("não exige MFA para customer", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/register",
      headers: { origin },
      payload: {
        phone: "67999908002",
        password: "cliente-mfa-08",
        termsAccepted: true,
        termsVersion: LILY_TERMS_VERSION,
        privacyPolicyVersion: LILY_PRIVACY_VERSION,
        consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
      }
    });
    const cookie = cookieFrom(response);
    const status = await app.inject({
      method: "GET",
      url: "/api/v1/lily/customer/security/mfa/status",
      headers: { cookie }
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      required: false,
      enabled: false,
      verified: true,
      setupRequired: false
    });
  });
});
