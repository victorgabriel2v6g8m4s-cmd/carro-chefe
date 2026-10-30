import crypto from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_PRIVACY_VERSION, LILY_TERMS_VERSION } from "./auth";
import { awardReachedLevelCoins, createLoyaltyConfigVersion, loyaltySnapshot, progressPointsForUser, recordPaidOrderPoints, redeemLoyaltyLevelBenefit, reversePaidOrderPoints, starterLevelRows } from "./loyalty/service";

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const phoneNormalized = `+5567999${suffix.slice(0, 8)}`;
let userId = "";
let levelId = "";
let rewardId = "";
let orderId = "";
let adminUserId = "";
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
const origin = "http://127.0.0.1:4173";

function cookieFrom(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  const raw = Array.isArray(value) ? value[0] : String(value ?? "");
  return raw.split(";")[0];
}

async function registerAdmin() {
  const server = app ??= await buildApp();
  const phone = `679${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  const response = await server.inject({
    method: "POST", url: "/api/v1/lily/auth/register", headers: { origin },
    payload: { phone, password: "senha-loyalty-levels-2026", termsAccepted: true, termsVersion: LILY_TERMS_VERSION, privacyPolicyVersion: LILY_PRIVACY_VERSION, consents: { lilyMarketing: false, shareWithCarroChefe: false, analyticsOptional: false } }
  });
  expect(response.statusCode, JSON.stringify(response.json())).toBe(201);
  const cookie = cookieFrom(response);
  adminUserId = response.json().user.id;
  await lilyPrisma.lilyUser.update({ where: { id: adminUserId }, data: { role: "admin", mfaEnabled: true, staffPasswordUpgradeRequired: false } });
  await lilyPrisma.lilySession.updateMany({ where: { userId: adminUserId }, data: { mfaVerifiedAt: new Date() } });
  const me = await server.inject({ method: "GET", url: "/api/v1/lily/auth/me", headers: { cookie } });
  return { server, cookie, csrf: me.json().csrfToken as string };
}

async function cleanup() {
  if (userId) await lilyPrisma.lilyUser.deleteMany({ where: { id: userId } });
  if (rewardId) await lilyPrisma.lilyReward.deleteMany({ where: { id: rewardId } });
  if (orderId) await lilyPrisma.lilyOrder.deleteMany({ where: { id: orderId } });
  if (levelId) await lilyPrisma.lilyLevel.deleteMany({ where: { id: levelId } });
  if (adminUserId) {
    await lilyPrisma.lilySession.deleteMany({ where: { userId: adminUserId } });
    await lilyPrisma.lilyConsentRecord.deleteMany({ where: { userId: adminUserId } });
    await lilyPrisma.lilyUser.delete({ where: { id: adminUserId } });
  }
  userId = "";
  levelId = "";
  rewardId = "";
  orderId = "";
  adminUserId = "";
}

afterEach(cleanup);
afterAll(async () => { await cleanup(); await app?.close(); });

describe("progressão de níveis e LilyCoins", () => {
  it("fornece a sequência editável de 21 níveis com a curva inicial documentada", () => {
    const levels = starterLevelRows();
    expect(levels).toHaveLength(21);
    expect(levels[0]).toMatchObject({ name: "Bronze I", requiredPoints: 0 });
    expect(levels[1]).toMatchObject({ name: "Bronze II", requiredPoints: 200 });
    expect(levels[2]).toMatchObject({ name: "Bronze III", requiredPoints: 532 });
    expect(levels.at(-1)).toMatchObject({ name: "Elite", requiredPoints: 10_000_000 });
    expect(levels.every((level, index) => index === 0 || level.requiredPoints > levels[index - 1].requiredPoints)).toBe(true);
  });

  it("salva um nível inicial de 0 pontos e aponta com clareza um limiar duplicado", async () => {
    const { server, cookie, csrf } = await registerAdmin();
    const initialLevels = [
      { id: crypto.randomUUID(), name: "Sem Nível", sortOrder: 0, requiredPoints: 0, lilyCoins: 0, benefits: [], iconMediaId: null, active: true },
      { id: crypto.randomUUID(), name: "Bronze I", sortOrder: 1, requiredPoints: 100, lilyCoins: 0, benefits: [], iconMediaId: null, active: true }
    ];
    const headers = { cookie, origin, "x-lily-csrf": csrf };
    const saved = await server.inject({ method: "PUT", url: "/api/v1/lily/admin/loyalty/levels", headers, payload: { levels: initialLevels, roundingMode: "floor" } });
    expect(saved.statusCode, JSON.stringify(saved.json())).toBe(200);
    const duplicated = await server.inject({ method: "PUT", url: "/api/v1/lily/admin/loyalty/levels", headers, payload: {
      levels: [initialLevels[0], { ...initialLevels[1], requiredPoints: 0 }], roundingMode: "floor"
    } });
    expect(duplicated.statusCode).toBe(400);
    expect(duplicated.json().error).toContain("“Sem Nível” e “Bronze I”");
  });

  it("insere um novo nível no início sem colidir IDs nem perder os níveis existentes", async () => {
    const { server, cookie, csrf } = await registerAdmin();
    const headers = { cookie, origin, "x-lily-csrf": csrf };
    const current = await server.inject({ method: "GET", url: "/api/v1/lily/admin/loyalty", headers: { cookie } });
    const original = (current.json().levels as Array<{ id: string; name: string; sortOrder: number; requiredPoints: number; lilyCoins: number; benefits: unknown[]; iconMediaId: string | null; active: boolean }>).map(({ id, name, sortOrder, requiredPoints, lilyCoins, benefits, iconMediaId, active }) => ({ id, name, sortOrder, requiredPoints, lilyCoins, benefits, iconMediaId, active }));
    const baseline = original.length >= 2 ? original.map((level) => ({ ...level, lilyCoins: 0 })) : [
      { id: crypto.randomUUID(), name: `Bronze teste ${suffix}`, sortOrder: 0, requiredPoints: 100, lilyCoins: 0, benefits: [], iconMediaId: null, active: true },
      { id: crypto.randomUUID(), name: `Prata teste ${suffix}`, sortOrder: 1, requiredPoints: 200, lilyCoins: 0, benefits: [], iconMediaId: null, active: true }
    ];
    const orderedBaseline = [...baseline].sort((a, b) => a.sortOrder - b.sortOrder).map((level, index) => ({ ...level, sortOrder: index, requiredPoints: Math.max(level.requiredPoints, index + 1) }));
    const trialLevels = [
      { id: crypto.randomUUID(), name: `Sem Nível teste ${suffix}`, sortOrder: 0, requiredPoints: 0, lilyCoins: 0, benefits: [], iconMediaId: null, active: true },
      ...orderedBaseline.map((level, index) => ({ ...level, sortOrder: index + 1 }))
    ];

    try {
      const baselineSave = await server.inject({ method: "PUT", url: "/api/v1/lily/admin/loyalty/levels", headers, payload: { levels: orderedBaseline, roundingMode: "floor" } });
      expect(baselineSave.statusCode, JSON.stringify(baselineSave.json())).toBe(200);
      const inserted = await server.inject({ method: "PUT", url: "/api/v1/lily/admin/loyalty/levels", headers, payload: { levels: trialLevels, roundingMode: "floor" } });
      expect(inserted.statusCode, JSON.stringify(inserted.json())).toBe(200);
      const afterInsert = await server.inject({ method: "GET", url: "/api/v1/lily/admin/loyalty", headers: { cookie } });
      expect(afterInsert.json().levels).toHaveLength(trialLevels.length);
      expect(afterInsert.json().levels[0]).toMatchObject({ name: trialLevels[0].name, requiredPoints: 0 });
      expect(afterInsert.json().levels.slice(1).map((level: { id: string }) => level.id)).toEqual(orderedBaseline.map((level) => level.id));
    } finally {
      await server.inject({ method: "PUT", url: "/api/v1/lily/admin/loyalty/levels", headers, payload: { levels: original, roundingMode: "floor" } });
    }
  });

  it("soma pontos, reconhece o nível alcançado e registra LilyCoins de nível sem duplicar", async () => {
    const user = await lilyPrisma.lilyUser.create({ data: { phoneNormalized, passwordHash: "test-only", displayName: "Conta teste de fidelidade" } });
    userId = user.id;
    const lastLevel = await lilyPrisma.lilyLevel.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const level = await lilyPrisma.lilyLevel.create({ data: { name: `Nível teste ${suffix}`, sortOrder: (lastLevel?.sortOrder ?? -1) + 1, requiredPoints: 1, lilyCoins: 12, benefitsJson: JSON.stringify(["Benefício de teste"]) } });
    levelId = level.id;
    const reward = await lilyPrisma.lilyReward.create({ data: { title: `Recompensa teste ${suffix}`, type: "product", lilyCoinCost: 10, active: true } });
    rewardId = reward.id;
    await lilyPrisma.lilyLoyaltyEvent.create({ data: { userId, type: "survey_reward", points: 125, sourceKey: `loyalty-test:${suffix}`, metadataJson: "{}" } });

    expect(await progressPointsForUser(userId)).toBe(125);
    await awardReachedLevelCoins(userId, 0, 125);
    await awardReachedLevelCoins(userId, 0, 125);
    const snapshot = await loyaltySnapshot(userId);

    expect(snapshot).toMatchObject({ points: 125, lilyCoins: 12, currentLevel: { id: level.id, name: level.name } });
    expect(snapshot.rewards.find(({ id }) => id === reward.id)).toMatchObject({ canRedeem: true });
    expect(await lilyPrisma.lilyCoinEvent.count({ where: { userId, sourceKey: `level:${level.id}:user:${userId}` } })).toBe(1);
  });

  it("mantém pontos de compra no ledger com a versão aplicada e estorna sem duplicar", async () => {
    const user = await lilyPrisma.lilyUser.create({ data: { phoneNormalized: `+5567998${suffix.slice(0, 8)}`, passwordHash: "test-only", displayName: "Conta teste de ledger" } });
    userId = user.id;
    const order = await lilyPrisma.lilyOrder.create({ data: {
      orderNumber: `LOYALTY-${suffix}`, idempotencyKey: `loyalty-order-${suffix}`, requestFingerprint: "loyalty-ledger-test",
      userId, phoneNormalized, fulfillmentType: "pickup", status: "paid", subtotalCents: 150,
      deliveryFeeCents: 0, grandTotalCents: 150
    } });
    orderId = order.id;
    const version = await createLoyaltyConfigVersion(userId);
    await recordPaidOrderPoints(userId, order);
    const event = await lilyPrisma.lilyLoyaltyEvent.findUnique({ where: { sourceKey: `order:${order.id}` } });
    expect(event?.configVersion).toBe(version.version);
    const originalPoints = await progressPointsForUser(userId);
    await lilyPrisma.lilyOrder.update({ where: { id: order.id }, data: { grandTotalCents: 9000 } });
    expect(await progressPointsForUser(userId)).toBe(originalPoints);

    await lilyPrisma.lilyOrder.update({ where: { id: order.id }, data: { status: "refunded" } });
    await reversePaidOrderPoints(userId, order);
    await reversePaidOrderPoints(userId, order);
    expect(await progressPointsForUser(userId)).toBe(0);
    expect(await lilyPrisma.lilyLoyaltyEvent.count({ where: { sourceKey: `order-refund:${order.id}` } })).toBe(1);
  });

  it("emite códigos de benefício no limite configurado por usuário e conserva o histórico", async () => {
    const user = await lilyPrisma.lilyUser.create({ data: { phoneNormalized, passwordHash: "test-only", displayName: "Conta teste de benefício" } });
    userId = user.id;
    const benefit = { id: "note:pickup", kind: "note", entityId: "pickup", label: "Acompanhamento grátis", categoryId: null, maxRedemptionsPerUser: 2, selectionMode: "customer_choice", configuration: { variantIds: [], flavorIds: [], addonIds: [] } };
    const level = await lilyPrisma.lilyLevel.create({ data: { name: `Nível resgate ${suffix}`, sortOrder: 200, requiredPoints: 0, benefitsJson: JSON.stringify([benefit]) } });
    levelId = level.id;

    const first = await redeemLoyaltyLevelBenefit(userId, levelId, benefit.id);
    const second = await redeemLoyaltyLevelBenefit(userId, levelId, benefit.id);
    await expect(redeemLoyaltyLevelBenefit(userId, levelId, benefit.id)).rejects.toThrow("limite de resgates");
    expect(first.redemptionCode).not.toBe(second.redemptionCode);
    expect(await lilyPrisma.lilyLevelBenefitRedemption.count({ where: { userId, levelId, benefitId: benefit.id } })).toBe(2);
  });

  it("aplica o limite de resgate dentro da transação mesmo diante de chamadas simultâneas", async () => {
    const user = await lilyPrisma.lilyUser.create({ data: { phoneNormalized, passwordHash: "test-only", displayName: "Conta teste concorrente" } });
    userId = user.id;
    const benefit = { id: "note:single", kind: "note", entityId: "single", label: "Benefício único", categoryId: null, maxRedemptionsPerUser: 1, selectionMode: "customer_choice", configuration: { variantIds: [], flavorIds: [], addonIds: [] } };
    const level = await lilyPrisma.lilyLevel.create({ data: { name: `Nível concorrente ${suffix}`, sortOrder: 201, requiredPoints: 0, benefitsJson: JSON.stringify([benefit]) } });
    levelId = level.id;

    const results = await Promise.allSettled([
      redeemLoyaltyLevelBenefit(userId, levelId, benefit.id),
      redeemLoyaltyLevelBenefit(userId, levelId, benefit.id)
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await lilyPrisma.lilyLevelBenefitRedemption.count({ where: { userId, levelId, benefitId: benefit.id } })).toBe(1);
  });
});
