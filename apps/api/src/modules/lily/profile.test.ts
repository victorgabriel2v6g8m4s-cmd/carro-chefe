import { afterAll, afterEach, describe, expect, it } from "vitest";
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

async function register(phone: string, displayName?: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/lily/auth/register",
    headers: { origin },
    payload: {
      phone,
      password: "senha-cooklily-perfil-2026",
      displayName,
      termsAccepted: true,
      termsVersion: LILY_TERMS_VERSION,
      privacyPolicyVersion: LILY_PRIVACY_VERSION,
      consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
    }
  });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  expect(me.statusCode).toBe(200);
  return { cookie, csrf: me.json().csrfToken, user: me.json().user };
}

const testPhones = ["+5567999970001", "+5567999970002", "+5567999970003", "+5567999970004"];

async function cleanup() {
  const users = await lilyPrisma.lilyUser.findMany({ where: { phoneNormalized: { in: testPhones } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    // Itens, adicionais e eventos de status caem em cascata ao remover o pedido.
    await lilyPrisma.lilyOrder.deleteMany({ where: { userId: { in: userIds } } });
    await lilyPrisma.lilyLoyaltyEvent.deleteMany({ where: { userId: { in: userIds } } });
    await lilyPrisma.lilyConsentRecord.deleteMany({ where: { userId: { in: userIds } } });
    await lilyPrisma.lilySession.deleteMany({ where: { userId: { in: userIds } } });
    await lilyPrisma.lilyUser.deleteMany({ where: { id: { in: userIds } } });
  }
}

afterEach(async () => {
  await cleanup();
  await lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: "default" },
    update: {
      instagramHandle: "acai._lily",
      whatsappPhone: "+5567999289187",
      publicAddressText: null,
      loyaltyOrderCentsPerPoint: 100,
      loyaltyCampaignBonusPoints: 10,
      loyaltyCouponBonusPoints: 10
    },
    create: { id: "default" }
  });
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("CookLily perfil e fidelidade", () => {
  it("lê status de autenticação sem exigir sessão", async () => {
    const guest = await app.inject({ method: "GET", url: "/api/v1/lily/auth/status" });
    expect(guest.statusCode).toBe(200);
    expect(guest.json().user).toBeNull();

    const account = await register("67999970001", "Cliente Perfil");
    const authenticated = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/status",
      headers: { cookie: account.cookie }
    });
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.json().user.displayName).toBe("Cliente Perfil");
    expect(authenticated.json().user).not.toHaveProperty("csrfToken");
  });

  it("serve Instagram, WhatsApp e endereço a partir da configuração operacional", async () => {
    await lilyPrisma.lilyOperationalSettings.upsert({
      where: { id: "default" },
      update: {
        instagramHandle: "acai._lily",
        whatsappPhone: "+5567991112233",
        publicAddressText: "Rua Configurável, 123"
      },
      create: {
        id: "default",
        instagramHandle: "acai._lily",
        whatsappPhone: "+5567991112233",
        publicAddressText: "Rua Configurável, 123"
      }
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/lily/public/config" });
    expect(response.statusCode).toBe(200);
    expect(response.json().social.instagramHandle).toBe("acai._lily");
    expect(response.json().social.instagramUrl).toBe("https://instagram.com/acai._lily");
    expect(response.json().social.whatsappUrl).toBe("https://wa.me/5567991112233");
    expect(response.json().store.address).toBe("Rua Configurável, 123");
  });

  it("exige CSRF para editar perfil e nome para participar do ranking", async () => {
    const account = await register("67999970002");

    const rejected = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/customer/profile",
      headers: { origin, cookie: account.cookie },
      payload: { displayName: "Cliente Ranking" }
    });
    expect(rejected.statusCode).toBe(403);

    const noName = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/customer/profile",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: { rankingOptIn: true }
    });
    expect(noName.statusCode).toBe(400);
    expect(noName.json().details.code).toBe("LILY_RANKING_NAME_REQUIRED");

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/customer/profile",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: { displayName: "Cliente Ranking", rankingOptIn: true }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().user.displayName).toBe("Cliente Ranking");
    expect(updated.json().user.rankingOptIn).toBe(true);
  });

  it("calcula ranking automaticamente com compras pagas, campanha e ledger de cupom", async () => {
    const account = await register("67999970003", "Cliente Pontos");
    await lilyPrisma.lilyUser.update({
      where: { id: account.user.id },
      data: { rankingOptIn: true }
    });

    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        loyaltyOrderCentsPerPoint: 100,
        loyaltyCampaignBonusPoints: 10,
        loyaltyCouponBonusPoints: 10
      }
    });

    await lilyPrisma.lilyOrder.create({
      data: {
        orderNumber: "POINTS-PAID-001",
        idempotencyKey: "points-paid-001",
        requestFingerprint: "points-paid-fingerprint",
        userId: account.user.id,
        phoneNormalized: account.user.phone,
        fulfillmentType: "pickup",
        status: "paid",
        subtotalCents: 1500,
        deliveryFeeCents: 0,
        grandTotalCents: 1500,
        laCampaign: "campanha-ranking"
      }
    });

    await lilyPrisma.lilyOrder.create({
      data: {
        orderNumber: "POINTS-PENDING-001",
        idempotencyKey: "points-pending-001",
        requestFingerprint: "points-pending-fingerprint",
        userId: account.user.id,
        phoneNormalized: account.user.phone,
        fulfillmentType: "pickup",
        status: "awaiting_payment",
        subtotalCents: 9000,
        deliveryFeeCents: 0,
        grandTotalCents: 9000,
        laCampaign: "nao-deve-pontuar"
      }
    });

    await lilyPrisma.lilyLoyaltyEvent.create({
      data: {
        userId: account.user.id,
        type: "coupon_redeemed",
        points: 7,
        sourceKey: "coupon:test:points-001",
        metadataJson: JSON.stringify({ coupon: "TESTE" })
      }
    });

    const profile = await app.inject({
      method: "GET",
      url: "/api/v1/lily/customer/profile",
      headers: { cookie: account.cookie }
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json().loyalty.points).toBe(32);
    expect(profile.json().loyalty.orderCount).toBe(1);
    expect(profile.json().loyalty.campaignCount).toBe(1);

    const ranking = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/ranking" });
    expect(ranking.statusCode).toBe(200);
    const row = ranking.json().ranking.find((item: { displayName: string }) => item.displayName === "Cliente Pontos");
    expect(row).toBeTruthy();
    expect(row.points).toBe(32);
  });

  it("troca senha autenticada, exige senha atual e revoga outras sessões", async () => {
    const account = await register("67999970004", "Cliente Segurança");

    const secondLogin = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/login",
      payload: {
        phone: "67999970004",
        password: "senha-cooklily-perfil-2026"
      }
    });
    expect(secondLogin.statusCode).toBe(200);
    const secondCookie = cookieFrom(secondLogin);

    const wrong = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/profile/password",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: {
        currentPassword: "senha-atual-incorreta",
        newPassword: "nova1234"
      }
    });
    expect(wrong.statusCode).toBe(401);

    const changed = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/profile/password",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: {
        currentPassword: "senha-cooklily-perfil-2026",
        newPassword: "nova1234"
      }
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json().changed).toBe(true);
    expect(changed.json().otherSessionsRevoked).toBeGreaterThanOrEqual(1);

    const revokedStatus = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/status",
      headers: { cookie: secondCookie }
    });
    expect(revokedStatus.statusCode).toBe(200);
    expect(revokedStatus.json().user).toBeNull();

    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/login",
      payload: { phone: "67999970004", password: "senha-cooklily-perfil-2026" }
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/login",
      payload: { phone: "67999970004", password: "nova1234" }
    });
    expect(newLogin.statusCode).toBe(200);

    await lilyPrisma.lilyUser.update({
      where: { id: account.user.id },
      data: { role: "staff" }
    });

    const staffShortPassword = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/profile/password",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: {
        currentPassword: "nova1234",
        newPassword: "staff123"
      }
    });
    expect(staffShortPassword.statusCode).toBe(400);
    expect(staffShortPassword.json().details.code).toBe("LILY_STAFF_PASSWORD_POLICY");
  });

});
