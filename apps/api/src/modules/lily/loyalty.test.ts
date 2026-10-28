import crypto from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { awardReachedLevelCoins, loyaltySnapshot, progressPointsForUser } from "./loyalty/service";

const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const phoneNormalized = `+5567999${suffix.slice(0, 8)}`;
let userId = "";
let levelId = "";
let rewardId = "";

async function cleanup() {
  if (userId) await lilyPrisma.lilyUser.deleteMany({ where: { id: userId } });
  if (rewardId) await lilyPrisma.lilyReward.deleteMany({ where: { id: rewardId } });
  if (levelId) await lilyPrisma.lilyLevel.deleteMany({ where: { id: levelId } });
  userId = "";
  levelId = "";
  rewardId = "";
}

afterEach(cleanup);
afterAll(async () => { await cleanup(); });

describe("progressão de níveis e LilyCoins", () => {
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
});
