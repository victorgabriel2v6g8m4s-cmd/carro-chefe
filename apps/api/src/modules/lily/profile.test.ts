import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { recordPaidOrderPoints } from "./loyalty/service";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { LILY_PROFILE_AVATAR_MAX_BYTES } from "./profile";

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
    remoteAddress: `127.0.1.${Number(phone.slice(-2)) || 1}`,
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

const testPhones = ["+5567999970001", "+5567999970002", "+5567999970003", "+5567999970004", "+5567999970005", "+5567999970011", "+5567999970012", "+5567999970013", "+5567999970014", "+5567999970015", "+5567999970016", "+5567999970017"];

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
  it("mantém o limite server-side da foto de perfil em 5 MB", () => {
    expect(LILY_PROFILE_AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
  });


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

  it("usa os padrões de preferências e persiste consentimentos do perfil com histórico", async () => {
    const account = await register("67999970005", "Cliente Preferências");
    expect(account.user.rankingOptIn).toBe(true);

    const before = await app.inject({
      method: "GET",
      url: "/api/v1/lily/customer/profile",
      headers: { cookie: account.cookie }
    });
    expect(before.statusCode).toBe(200);
    expect(before.json().user.rankingOptIn).toBe(true);
    expect(before.json().user.whatsappUpdatesOptIn).toBe(true);
    expect(before.json().user.whatsappOffersOptIn).toBe(false);

    const updated = await app.inject({
      method: "PATCH",
      url: "/api/v1/lily/customer/profile",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf },
      payload: {
        rankingOptIn: false,
        whatsappUpdatesOptIn: false,
        whatsappOffersOptIn: true
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().user.rankingOptIn).toBe(false);
    expect(updated.json().user.whatsappUpdatesOptIn).toBe(false);
    expect(updated.json().user.whatsappOffersOptIn).toBe(true);

    const records = await lilyPrisma.lilyConsentRecord.findMany({
      where: { userId: account.user.id, purpose: { in: ["whatsapp_order_updates", "whatsapp_offers"] } },
      orderBy: { recordedAt: "desc" }
    });
    expect(records).toHaveLength(2);
    expect(records.find((record) => record.purpose === "whatsapp_order_updates")?.granted).toBe(false);
    expect(records.find((record) => record.purpose === "whatsapp_offers")?.granted).toBe(true);
    expect(records.every((record) => record.source === "profile_settings")).toBe(true);
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

    const paidOrder = await lilyPrisma.lilyOrder.create({
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
    await recordPaidOrderPoints(account.user.id, paidOrder);

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

  it("esconde contas de teste do ranking público e só empata teste com cliente real", async () => {
    const publicA = await register("67999970011", "Ranking Comum A");
    const publicB = await register("67999970012", "Ranking Comum B");
    const tester = await register("67999970013", "Conta de Homologação");
    const publicC = await register("67999970014", "Ranking Comum C");
    const admin = await register("67999970015", "Admin CookLily");
    await lilyPrisma.lilyUser.update({ where: { id: tester.user.id }, data: { isTestAccount: true, rankingOptIn: false } });
    await lilyPrisma.lilyUser.update({ where: { id: admin.user.id }, data: { role: "staff" } });
    for (const [userId, points] of [[publicA.user.id, 500], [publicB.user.id, 500], [tester.user.id, 500], [publicC.user.id, 300], [admin.user.id, 900]] as const) {
      await lilyPrisma.lilyLoyaltyEvent.create({ data: { userId, type: "survey_reward", points, sourceKey: `dense-rank:${userId}`, metadataJson: "{}" } });
    }
    const publicRanking = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/ranking?limit=50" });
    expect(publicRanking.statusCode).toBe(200);
    const publicRows = publicRanking.json().ranking as Array<{ displayName: string; rank: number }>;
    expect(publicRows.some((row) => row.displayName === "Conta de Homologação")).toBe(false);
    expect(publicRows.some((row) => row.displayName === "Admin CookLily")).toBe(false);
    expect(publicRows.find((row) => row.displayName === "Ranking Comum A")?.rank).toBe(1);
    expect(publicRows.find((row) => row.displayName === "Ranking Comum B")?.rank).toBe(2);
    expect(publicRows.find((row) => row.displayName === "Ranking Comum C")?.rank).toBe(3);

    const privateRanking = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/ranking?limit=50", headers: { cookie: tester.cookie } });
    const privateRows = privateRanking.json().ranking as Array<{ displayName: string; rank: number }>;
    expect(privateRows.some((row) => row.displayName === "Conta de Homologação")).toBe(true);
    expect(privateRows.some((row) => row.displayName === "Admin CookLily")).toBe(false);
    expect(privateRows.filter((row) => row.rank === 1)).toHaveLength(2);
    expect(privateRows.find((row) => row.displayName === "Conta de Homologação")?.rank).toBe(1);
    expect(privateRows.find((row) => row.displayName === "Ranking Comum A")?.rank).toBe(1);
    expect(privateRows.find((row) => row.displayName === "Ranking Comum B")?.rank).toBe(2);
    expect(privateRows.find((row) => row.displayName === "Ranking Comum C")?.rank).toBe(3);
    const staffRanking = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/ranking?limit=50", headers: { cookie: admin.cookie } });
    expect((staffRanking.json().ranking as Array<{ displayName: string }>).some((row) => row.displayName === "Conta de Homologação")).toBe(true);
    const testerProfile = await app.inject({ method: "GET", url: "/api/v1/lily/customer/profile", headers: { cookie: tester.cookie } });
    expect(testerProfile.json().loyalty.rankScope).toBe("internal");
    const publicProfile = await app.inject({ method: "GET", url: "/api/v1/lily/customer/profile", headers: { cookie: publicA.cookie } });
    expect(publicProfile.json().loyalty.rankScope).toBe("public");
    const staffProfile = await app.inject({ method: "GET", url: "/api/v1/lily/customer/profile", headers: { cookie: admin.cookie } });
    expect(staffProfile.json().loyalty.rankScope).toBe("internal");
  });

  it("serve estatísticas ao próprio cliente, respeita privacidade de terceiros e lista níveis ativos publicamente", async () => {
    const owner = await register("67999970016", "Cliente Estatísticas");
    const other = await register("67999970017", "Cliente Privado");
    await lilyPrisma.lilyUser.update({ where: { id: other.user.id }, data: { rankingOptIn: false } });
    await lilyPrisma.lilyLoyaltyEvent.create({ data: { userId: owner.user.id, type: "mission_reward", points: 25, sourceKey: `stats:${owner.user.id}`, metadataJson: "{}" } });
    const ownStats = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/stats", headers: { cookie: owner.cookie } });
    expect(ownStats.statusCode).toBe(200);
    expect(ownStats.json().totals.missions).toBe(25);
    expect(ownStats.json().months).toHaveLength(6);
    const privateStats = await app.inject({ method: "GET", url: `/api/v1/lily/public/loyalty/stats?userId=${other.user.id}`, headers: { cookie: owner.cookie } });
    expect(privateStats.statusCode).toBe(404);
    await lilyPrisma.lilyUser.update({ where: { id: other.user.id }, data: { rankingOptIn: true } });
    const optedInStats = await app.inject({ method: "GET", url: `/api/v1/lily/public/loyalty/stats?userId=${other.user.id}`, headers: { cookie: owner.cookie } });
    expect(optedInStats.statusCode).toBe(200);
    const anonymousOptedInStats = await app.inject({ method: "GET", url: `/api/v1/lily/public/loyalty/stats?userId=${other.user.id}` });
    expect(anonymousOptedInStats.statusCode).toBe(200);
    const levels = await app.inject({ method: "GET", url: "/api/v1/lily/public/loyalty/levels" });
    expect(levels.statusCode).toBe(200);
    expect(levels.json()).toHaveProperty("levels");
  });

  it("lista somente as próprias sessões e permite encerrar as outras explicitamente", async () => {
    const account = await register("67999970004", "Cliente Sessões");
    const secondLogin = await app.inject({
      method: "POST",
      url: "/api/v1/lily/auth/login",
      headers: { origin },
      payload: {
        phone: "67999970004",
        password: "senha-cooklily-perfil-2026"
      }
    });
    expect(secondLogin.statusCode).toBe(200);
    const secondCookie = cookieFrom(secondLogin);

    const sessions = await app.inject({
      method: "GET",
      url: "/api/v1/lily/customer/security/sessions",
      headers: { cookie: account.cookie }
    });
    expect(sessions.statusCode).toBe(200);
    expect(sessions.json().sessions).toHaveLength(2);
    expect(sessions.json().sessions.filter((item: { current: boolean }) => item.current)).toHaveLength(1);
    for (const item of sessions.json().sessions) {
      expect(item).not.toHaveProperty("tokenHash");
      expect(item).not.toHaveProperty("csrfTokenHash");
    }

    const rejected = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/sessions/revoke-others",
      headers: { origin, cookie: account.cookie }
    });
    expect(rejected.statusCode).toBe(403);
    expect(rejected.json().details.code).toBe("LILY_CSRF_REQUIRED");

    const revoked = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/security/sessions/revoke-others",
      headers: { origin, cookie: account.cookie, "x-lily-csrf": account.csrf }
    });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json().revoked).toBeGreaterThanOrEqual(1);

    const currentStillWorks = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/me",
      headers: { cookie: account.cookie }
    });
    expect(currentStillWorks.statusCode).toBe(200);

    const otherRevoked = await app.inject({
      method: "GET",
      url: "/api/v1/lily/auth/status",
      headers: { cookie: secondCookie }
    });
    expect(otherRevoked.statusCode).toBe(200);
    expect(otherRevoked.json().user).toBeNull();
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
