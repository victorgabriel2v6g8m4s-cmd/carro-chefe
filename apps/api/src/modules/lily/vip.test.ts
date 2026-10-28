import crypto from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { LILY_VIP_TERMS_VERSION } from "./vip";
import { calculateLilyCouponQuote } from "./coupon-calculation";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";
const phone = "+5567999964510";
const invite = `LILY-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
let codeSuffix = "";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function register() {
  const response = await app.inject({ method: "POST", url: "/api/v1/lily/auth/register", headers: { origin }, payload: {
    phone, password: "senha-cooklily-vip-test-2026", displayName: "Cliente VIP",
    termsAccepted: true, termsVersion: LILY_TERMS_VERSION, privacyPolicyVersion: LILY_PRIVACY_VERSION,
    consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false }
  } });
  expect(response.statusCode).toBe(201);
  const cookie = cookieFrom(response);
  const me = await app.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { cookie, csrf: me.json().csrfToken, userId: me.json().user.id as string };
}

async function cleanup() {
  const user = await lilyPrisma.lilyUser.findUnique({ where: { phoneNormalized: phone }, select: { id: true } });
  if (user) {
    await lilyPrisma.lilyVipAnalyticsEvent.deleteMany({ where: { userId: user.id } });
    await lilyPrisma.lilyVipMembership.deleteMany({ where: { userId: user.id } });
    await lilyPrisma.lilyVipRedemption.deleteMany({ where: { userId: user.id } });
    await lilyPrisma.lilyConsentRecord.deleteMany({ where: { userId: user.id } });
    await lilyPrisma.lilySession.deleteMany({ where: { userId: user.id } });
    await lilyPrisma.lilyUser.delete({ where: { id: user.id } });
  }
  if (codeSuffix) await lilyPrisma.lilyVipCode.deleteMany({ where: { displaySuffix: codeSuffix } });
  await lilyPrisma.lilyCoupon.deleteMany({ where: { title: "Cupom de teste VIP" } });
  await lilyPrisma.lilyOperationalSettings.updateMany({ data: { vipPointsThreshold: 0 } });
  codeSuffix = "";
}

afterEach(cleanup);
afterAll(async () => { await cleanup(); await app.close(); });

describe("programa VIP CookLily", () => {
  it("resgata o código recém-gerado pelo painel mesmo após colar com espaços, caixa baixa e hífen tipográfico", async () => {
    const account = await register();
    await lilyPrisma.lilyUser.update({ where: { id: account.userId }, data: { role: "admin", mfaEnabled: true, staffPasswordUpgradeRequired: false } });
    await lilyPrisma.lilySession.updateMany({ where: { userId: account.userId }, data: { mfaVerifiedAt: new Date() } });

    const expiredCreate = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/vip/codes",
      headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin },
      payload: { kind: "vip", couponIds: [], startsAt: null, endsAt: new Date(Date.now() - 60_000).toISOString(), maxRedemptions: null }
    });
    expect(expiredCreate.statusCode).toBe(400);
    expect(expiredCreate.json().details.code).toBe("LILY_VIP_CODE_EXPIRY_PAST");

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/lily/admin/vip/codes",
      headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin },
      payload: { kind: "vip", couponIds: [], startsAt: null, endsAt: null, maxRedemptions: null }
    });
    expect(created.statusCode).toBe(201);
    const generatedCode = created.json().code as string;
    codeSuffix = generatedCode.slice(-4);

    await lilyPrisma.lilyVipCode.updateMany({ where: { displaySuffix: codeSuffix }, data: { endsAt: new Date(Date.now() - 60_000) } });
    const renewed = await app.inject({
      method: "PATCH",
      url: `/api/v1/lily/admin/vip/codes/${created.json().invite.id as string}`,
      headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin },
      payload: { status: "active", endsAt: null }
    });
    expect(renewed.statusCode).toBe(200);
    expect(renewed.json().endsAt).toBeNull();
    await lilyPrisma.lilyUser.update({ where: { id: account.userId }, data: { role: "customer", mfaEnabled: false } });

    const redeemed = await app.inject({
      method: "POST",
      url: "/api/v1/lily/customer/vip/redeem",
      headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin },
      payload: { code: ` ${generatedCode.toLowerCase().replace("-", " – ")} ` }
    });

    expect(redeemed.statusCode).toBe(200);
    expect(redeemed.json().kind).toBe("vip");
    expect(redeemed.json().membership.status).toBe("invited");
  });

  it("keeps an invite pending until versioned consent and explicit subscription", async () => {
    const account = await register();
    const code = `${invite}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    codeSuffix = code.slice(-4);
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    await lilyPrisma.lilyVipCode.create({ data: { codeHash, displaySuffix: code.slice(-4), kind: "vip", createdBy: "test" } });

    const redeemed = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/redeem", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { code } });
    expect(redeemed.statusCode).toBe(200);
    expect(redeemed.json().membership.status).toBe("invited");
    const noConsent = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/subscribe", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(noConsent.statusCode).toBe(403);

    const accepted = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/consent", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { version: LILY_VIP_TERMS_VERSION } });
    expect(accepted.statusCode).toBe(200);
    const subscribed = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/subscribe", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(subscribed.statusCode).toBe(200);
    expect(subscribed.json().membership.status).toBe("active");

    const canceled = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/cancel", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(canceled.statusCode).toBe(200);
    const profile = await app.inject({ method: "GET", url: "/api/v1/lily/customer/profile", headers: { cookie: account.cookie } });
    expect(profile.json().user.vipStatus).toBe("canceled");
    expect(await lilyPrisma.lilyConsentRecord.count({ where: { userId: account.userId, purpose: "vip_program_analytics", granted: false } })).toBeGreaterThan(0);
  });

  it("requires the configured points threshold before issuing a pending VIP application", async () => {
    const account = await register();
    const user = await lilyPrisma.lilyUser.findUniqueOrThrow({ where: { phoneNormalized: phone } });
    await lilyPrisma.lilyOperationalSettings.upsert({ where: { id: "default" }, create: { id: "default", vipPointsThreshold: 40 }, update: { vipPointsThreshold: 40 } });
    await lilyPrisma.lilyLoyaltyEvent.create({ data: { userId: user.id, type: "survey_reward", points: 39, sourceKey: `vip-threshold-${crypto.randomUUID()}` } });
    const denied = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/claim", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(denied.statusCode).toBe(403);
    await lilyPrisma.lilyLoyaltyEvent.create({ data: { userId: user.id, type: "survey_reward", points: 1, sourceKey: `vip-threshold-${crypto.randomUUID()}` } });
    const eligible = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/claim", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(eligible.statusCode).toBe(200);
    expect(eligible.json().membership.status).toBe("invited");
  });

  it("expires analytics only for active members and cancellation removes events immediately", async () => {
    const account = await register();
    const code = `LILY-RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    codeSuffix = code.slice(-4);
    await lilyPrisma.lilyVipCode.create({ data: { codeHash: crypto.createHash("sha256").update(code).digest("hex"), displaySuffix: codeSuffix, kind: "vip", createdBy: "test" } });
    await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/redeem", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { code } });
    await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/consent", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { version: LILY_VIP_TERMS_VERSION } });
    await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/subscribe", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    await lilyPrisma.lilyVipAnalyticsEvent.create({ data: { userId: account.userId, event: "launch_view", occurredAt: new Date("2020-01-01T00:00:00Z") } });
    await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/launch-view", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { productId: "product-test" } });
    expect(await lilyPrisma.lilyVipAnalyticsEvent.count({ where: { userId: account.userId, occurredAt: new Date("2020-01-01T00:00:00Z") } })).toBe(0);
    expect(await lilyPrisma.lilyVipAnalyticsEvent.count({ where: { userId: account.userId } })).toBeGreaterThan(0);
    await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/cancel", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: {} });
    expect(await lilyPrisma.lilyVipAnalyticsEvent.count({ where: { userId: account.userId } })).toBe(0);
  });

  it("grants a coupon as an account-bound voucher and rejects use from another account", async () => {
    const account = await register();
    const sourceCoupon = await lilyPrisma.lilyCoupon.create({ data: {
      code: `VIPSRC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, title: "Cupom de teste VIP", type: "free_shipping",
      status: "active", appliesToShipping: true, maxUsesPerCustomer: 1
    } });
    const code = `LILY-GIFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    codeSuffix = code.slice(-4);
    await lilyPrisma.lilyVipCode.create({ data: {
      codeHash: crypto.createHash("sha256").update(code).digest("hex"), displaySuffix: codeSuffix,
      kind: "coupons", couponIdsJson: JSON.stringify([sourceCoupon.id]), createdBy: "test"
    } });
    const redeemed = await app.inject({ method: "POST", url: "/api/v1/lily/customer/vip/redeem", headers: { cookie: account.cookie, "x-lily-csrf": account.csrf, origin }, payload: { code } });
    expect(redeemed.statusCode).toBe(200);
    const accountVip = await app.inject({ method: "GET", url: "/api/v1/lily/customer/vip", headers: { cookie: account.cookie } });
    const voucher = accountVip.json().coupons[0] as { code: string };
    expect(voucher.code).not.toBe(sourceCoupon.code);
    await expect(calculateLilyCouponQuote({ codes: [voucher.code], items: [], subtotalCents: 0, shippingCents: 100, fulfillmentType: "delivery", phone, userId: null })).rejects.toMatchObject({ details: { code: "LILY_COUPON_ACCOUNT_RESTRICTED" } });
    const quote = await calculateLilyCouponQuote({ codes: [voucher.code], items: [], subtotalCents: 0, shippingCents: 100, fulfillmentType: "delivery", phone, userId: account.userId });
    expect(quote.discountCents).toBe(100);
  });
});
