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

async function register(phone: string, role: "customer" | "admin" = "customer") {
  const secret = role === "admin" ? "senha-admin-equipe-2026" : "cliente08";
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: secret,
      displayName: `Equipe ${phone.slice(-4)}`,
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const id = response.json().user.id;
  if (role === "admin") {
    await lilyPrisma.lilyUser.update({
      where: { id },
      data: { role: "admin", staffPasswordUpgradeRequired: false }
    });
  }
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  expect(me.statusCode).toBe(200);
  return { cookie, csrf: me.json().csrfToken, user: me.json().user, secret };
}

async function cleanup() {
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany();
  await lilyPrisma.lilyAdminAudit.deleteMany();
  await lilyPrisma.lilyLoyaltyEvent.deleteMany();
  await lilyPrisma.lilyConsentRecord.deleteMany();
  await lilyPrisma.lilySession.deleteMany();
  await lilyPrisma.lilyUser.deleteMany();
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily gestão de equipe e RBAC", () => {
  it("suspensão revoga sessão e admin não remove o próprio acesso", async () => {
    const admin = await register("67999907103", "admin");
    const member = await register("67999907104");

    const promoted = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/team/promote",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { phone: member.user.phone, role: "admin" }
    });
    expect(promoted.statusCode).toBe(200);
    await lilyPrisma.lilyUser.update({
      where: { id: member.user.id },
      data: { staffPasswordUpgradeRequired: false }
    });

    const suspended = await app.inject({
      method: "PATCH",
      url: `/api/v1/lily/admin/team/${member.user.id}`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { status: "suspended" }
    });
    expect(suspended.statusCode).toBe(200);

    const sessionAfter = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/me",
      headers: { cookie: member.cookie }
    });
    expect(sessionAfter.statusCode).toBe(401);

    const selfLockout = await app.inject({
      method: "PATCH",
      url: `/api/v1/lily/admin/team/${admin.user.id}`,
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { role: "staff" }
    });
    expect(selfLockout.statusCode).toBe(409);
    expect(selfLockout.json().details.code).toBe("LILY_ADMIN_SELF_LOCKOUT");
  });

  it("includeCustomers=false mantém clientes fora da listagem", async () => {
    const admin = await register("67999907105", "admin");
    await register("67999907106");
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/team?includeCustomers=false",
      headers: { cookie: admin.cookie }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().members).toHaveLength(1);
    expect(response.json().members[0].role).toBe("admin");
  });

  it("promove conta existente e exige troca de senha antes do acesso staff", async () => {
    const admin = await register("67999907101", "admin");
    const customer = await register("67999907102");

    const promoted = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/team/promote",
      headers: { origin, cookie: admin.cookie, "x-lily-csrf": admin.csrf },
      payload: { phone: customer.user.phone, role: "staff" }
    });
    expect(promoted.statusCode).toBe(200);
    expect(promoted.json().staffPasswordUpgradeRequired).toBe(true);

    const blocked = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: customer.cookie }
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().details.code).toBe("LILY_STAFF_PASSWORD_UPGRADE_REQUIRED");

    const short = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/profile/password",
      headers: { origin, cookie: customer.cookie, "x-lily-csrf": customer.csrf },
      payload: { currentPassword: customer.secret, newPassword: "12345678" }
    });
    expect(short.statusCode).toBe(400);
    expect(short.json().details.code).toBe("LILY_STAFF_PASSWORD_POLICY");

    const changed = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/profile/password",
      headers: { origin, cookie: customer.cookie, "x-lily-csrf": customer.csrf },
      payload: { currentPassword: customer.secret, newPassword: "nova-senha-staff-2026" }
    });
    expect(changed.statusCode).toBe(200);

    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/catalog",
      headers: { cookie: customer.cookie }
    });
    expect(allowed.statusCode).toBe(200);

    const teamDenied = await app.inject({
      method: "GET",
      url: "/api/v1/lily/admin/team",
      headers: { cookie: customer.cookie }
    });
    expect(teamDenied.statusCode).toBe(403);
    expect(teamDenied.json().details.code).toBe("LILY_ADMIN_REQUIRED");
  });
});
