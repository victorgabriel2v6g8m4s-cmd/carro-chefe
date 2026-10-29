import crypto from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { awardReachedLevelCoins, createLoyaltyConfigVersion, loyaltySnapshot, progressPointsForUser, recordPaidOrderPoints, reversePaidOrderPoints, starterLevelRows } from "./loyalty/service";

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const phoneNormalized = `+5567999${suffix.slice(0, 8)}`;
let userId = "";
let levelId = "";
let rewardId = "";
let orderId = "";

async function cleanup() {
  if (userId) await lilyPrisma.lilyUser.deleteMany({ where: { id: userId } });
  if (rewardId) await lilyPrisma.lilyReward.deleteMany({ where: { id: rewardId } });
  if (orderId) await lilyPrisma.lilyOrder.deleteMany({ where: { id: orderId } });
  if (levelId) await lilyPrisma.lilyLevel.deleteMany({ where: { id: levelId } });
  userId = "";
  levelId = "";
  rewardId = "";
  orderId = "";
}

afterEach(cleanup);
afterAll(async () => { await cleanup(); });

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
});
