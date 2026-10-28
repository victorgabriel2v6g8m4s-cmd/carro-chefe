import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "../auth";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "../admin-security";

export const STARTER_LEVELS = [
  "Bronze I", "Bronze II", "Bronze III", "Prata I", "Prata II", "Prata III",
  "Ouro I", "Ouro II", "Ouro III", "Ouro IV", "Platina I", "Platina II",
  "Platina III", "Platina IV", "Platina V", "Diamante I", "Diamante II",
  "Diamante III", "Diamante IV", "Mestre", "Elite"
];

export function roundLoyaltyPoints(value: number, mode: string) {
  return mode === "ceil" ? Math.ceil(value) : mode === "nearest" ? Math.round(value) : Math.floor(value);
}

export async function progressPointsForUser(userId: string, db: Pick<typeof lilyPrisma, "lilyLoyaltyEvent" | "lilyOrder" | "lilyOperationalSettings"> = lilyPrisma) {
  const [events, orders, settings] = await Promise.all([
    db.lilyLoyaltyEvent.findMany({ where: { userId }, select: { points: true } }),
    db.lilyOrder.findMany({ where: { userId, status: { in: ["paid", "completed"] } }, select: { grandTotalCents: true, laCampaign: true } }),
    db.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyOrderCentsPerPoint: true, loyaltyCampaignBonusPoints: true, loyaltyRoundingMode: true } })
  ]);
  const campaigns = new Set(orders.flatMap((order) => order.laCampaign ? [order.laCampaign] : []));
  return events.reduce((total, event) => total + event.points, 0)
    + orders.reduce((total, order) => total + roundLoyaltyPoints(order.grandTotalCents / Math.max(1, settings?.loyaltyOrderCentsPerPoint ?? 100), settings?.loyaltyRoundingMode ?? "floor"), 0)
    + campaigns.size * (settings?.loyaltyCampaignBonusPoints ?? 10);
}

export async function loyaltySnapshot(userId: string) {
  const [points, levels, settings] = await Promise.all([
    progressPointsForUser(userId),
    lilyPrisma.lilyLevel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyRoundingMode: true } })
  ]);
  const [coinEvents] = await Promise.all([
    lilyPrisma.lilyCoinEvent.findMany({ where: { userId }, select: { amount: true } })
  ]);
  const levelIndex = levels.reduce((index, level, i) => points >= level.requiredPoints ? i : index, -1);
  const currentLevel = levelIndex >= 0 ? levels[levelIndex] : null;
  const nextLevel = levels[levelIndex + 1] ?? null;
  const lilyCoins = coinEvents.reduce((total, event) => total + event.amount, 0);
  const rewards = await lilyPrisma.lilyReward.findMany({ where: { active: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] }, orderBy: { lilyCoinCost: "asc" } });
  const earliestReward = rewards[0];
  return {
    points, lilyCoins, currentLevel: currentLevel ? { id: currentLevel.id, name: currentLevel.name, requiredPoints: currentLevel.requiredPoints, lilyCoins: currentLevel.lilyCoins, benefits: JSON.parse(currentLevel.benefitsJson) as string[] } : null,
    nextLevel: nextLevel ? { id: nextLevel.id, name: nextLevel.name, requiredPoints: nextLevel.requiredPoints, lilyCoins: nextLevel.lilyCoins, benefits: JSON.parse(nextLevel.benefitsJson) as string[] } : null,
    milestones: levels.map(({ id, name, requiredPoints, lilyCoins: award }) => ({ id, name, requiredPoints, lilyCoins: award, reached: points >= requiredPoints })),
    levelProgressPercent: currentLevel && nextLevel ? Math.max(0, Math.min(100, Math.round((points - currentLevel.requiredPoints) / Math.max(1, nextLevel.requiredPoints - currentLevel.requiredPoints) * 100))) : currentLevel ? 100 : 0,
    roundingMode: settings?.loyaltyRoundingMode ?? "floor",
    nextRewardTarget: earliestReward ? { title: earliestReward.title, lilyCoinCost: earliestReward.lilyCoinCost } : null,
    rewards: rewards.map(({ id, title, description, type, lilyCoinCost }) => ({ id, title, description, type, lilyCoinCost, canRedeem: lilyCoins >= lilyCoinCost }))
  };
}

export async function awardMissionLilyCoins(userId: string, missionId: string, amount: number) {
  if (amount <= 0) return;
  await lilyPrisma.lilyCoinEvent.upsert({ where: { sourceKey: `mission:${missionId}:user:${userId}` }, update: {}, create: {
    id: crypto.randomUUID(), userId, amount, kind: "mission", sourceKey: `mission:${missionId}:user:${userId}`, metadataJson: JSON.stringify({ missionId })
  } });
}

export async function awardReachedLevelCoins(userId: string, priorPoints: number, nextPoints: number, tx: { lilyLevel: typeof lilyPrisma.lilyLevel; lilyCoinEvent: typeof lilyPrisma.lilyCoinEvent } = lilyPrisma) {
  if (nextPoints <= priorPoints) return;
  const levels = await tx.lilyLevel.findMany({ where: { active: true, lilyCoins: { gt: 0 }, requiredPoints: { gt: priorPoints, lte: nextPoints } } });
  for (const level of levels) await tx.lilyCoinEvent.upsert({ where: { sourceKey: `level:${level.id}:user:${userId}` }, update: {}, create: {
    id: crypto.randomUUID(), userId, amount: level.lilyCoins, kind: "level", sourceKey: `level:${level.id}:user:${userId}`, metadataJson: JSON.stringify({ levelId: level.id })
  } });
}

export async function lilyLevelRoutes(app: FastifyInstance) {
  const levelsSchema = z.object({ levels: z.array(z.object({ id: z.string().max(80).optional(), name: z.string().trim().min(1).max(80), sortOrder: z.number().int().min(0).max(100), requiredPoints: z.number().int().min(0).max(1000000000), lilyCoins: z.number().int().min(0).max(100000000), benefits: z.array(z.string().trim().min(1).max(240)).max(20).default([]), active: z.boolean() }).strict()).max(100), roundingMode: z.enum(["floor", "ceil", "nearest"]) }).strict();
  app.get("/api/v1/lily/admin/loyalty", async (request) => {
    await requireLilyStaff(request);
    const [levels, settings, rewards, missions, coupons, products] = await Promise.all([
      lilyPrisma.lilyLevel.findMany({ orderBy: { sortOrder: "asc" } }),
      lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyRoundingMode: true } }),
      lilyPrisma.lilyReward.findMany({ orderBy: { createdAt: "desc" } }),
      lilyPrisma.lilyMission.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, points: true, lilyCoins: true } }),
      lilyPrisma.lilyCoupon.findMany({ where: { status: "active", assignedUserId: null }, select: { id: true, title: true, code: true }, orderBy: { title: "asc" } }),
      lilyPrisma.lilyProduct.findMany({ where: { status: "published" }, select: { id: true, displayName: true, slug: true }, orderBy: { displayName: "asc" } })
    ]);
    return { levels: levels.map(({ benefitsJson, ...row }) => ({ ...row, benefits: JSON.parse(benefitsJson) as string[] })), roundingMode: settings?.loyaltyRoundingMode ?? "floor", rewards, missions, coupons, products };
  });
  app.post("/api/v1/lily/admin/loyalty/rewards", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).nullable().optional(), type: z.enum(["coupon", "product"]), lilyCoinCost: z.number().int().min(1).max(100000000), couponId: z.string().max(80).nullable().optional(), productId: z.string().max(80).nullable().optional(), active: z.boolean().default(false), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), maxRedemptions: z.number().int().min(1).nullable().optional() }).strict().parse(request.body);
    if (input.type === "coupon" && !input.couponId || input.type === "product" && !input.productId) throw new ApiError(400, "Selecione o cupom ou produto da recompensa.");
    if (input.couponId && !await lilyPrisma.lilyCoupon.findUnique({ where: { id: input.couponId } })) throw new ApiError(400, "Cupom não encontrado.");
    if (input.productId && !await lilyPrisma.lilyProduct.findUnique({ where: { id: input.productId } })) throw new ApiError(400, "Produto não encontrado.");
    const reward = await lilyPrisma.lilyReward.create({ data: { id: crypto.randomUUID(), title: input.title, description: input.description ?? null, type: input.type, lilyCoinCost: input.lilyCoinCost, couponId: input.couponId ?? null, productId: input.productId ?? null, active: input.active, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, maxRedemptions: input.maxRedemptions ?? null } });
    await auditLilyAdmin(actor.user.id, "create", "loyalty-reward", reward.id, { type: reward.type, lilyCoinCost: reward.lilyCoinCost });
    return { reward };
  });
  app.put("/api/v1/lily/admin/loyalty/rewards/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const input = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).nullable(), type: z.enum(["coupon", "product"]), lilyCoinCost: z.number().int().min(1).max(100000000), couponId: z.string().max(80).nullable(), productId: z.string().max(80).nullable(), active: z.boolean() }).strict().parse(request.body);
    if (input.type === "coupon" && !input.couponId || input.type === "product" && !input.productId) throw new ApiError(400, "Selecione o cupom ou produto da recompensa.");
    const reward = await lilyPrisma.lilyReward.update({ where: { id }, data: input });
    await auditLilyAdmin(actor.user.id, "update", "loyalty-reward", reward.id, input);
    return { reward };
  });
  app.patch("/api/v1/lily/admin/loyalty/missions/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const input = z.object({ lilyCoins: z.number().int().min(0).max(1000000) }).strict().parse(request.body);
    const mission = await lilyPrisma.lilyMission.update({ where: { id }, data: input });
    await auditLilyAdmin(actor.user.id, "update", "mission", mission.id, input);
    return { mission: { id: mission.id, title: mission.title, lilyCoins: mission.lilyCoins } };
  });
  app.post("/api/v1/lily/customer/missions/:id/claim", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const id = (request.params as { id: string }).id;
    const mission = await lilyPrisma.lilyMission.findFirst({ where: { id, status: "published" } });
    if (!mission) throw new ApiError(404, "Missão não encontrada.");
    const completed = await lilyPrisma.lilySurveyParticipation.findMany({ where: { userId: context.user.id, status: "completed" }, select: { surveyId: true } });
    const surveyRows = completed.length ? await lilyPrisma.lilySurvey.findMany({ where: { id: { in: completed.map(({ surveyId }) => surveyId) } }, select: { unlocksMissionsJson: true } }) : [];
    const unlockedBySurvey = surveyRows.some((row) => (JSON.parse(row.unlocksMissionsJson) as string[]).includes(id));
    const prerequisites = JSON.parse(mission.prerequisiteJson) as string[];
    if (!unlockedBySurvey && !prerequisites.every((prerequisiteId) => completed.some(({ surveyId }) => surveyId === prerequisiteId))) throw new ApiError(403, "Conclua os requisitos desta missão primeiro.");
    const priorPoints = mission.points > 0 ? await progressPointsForUser(context.user.id) : 0;
    await lilyPrisma.$transaction(async (tx) => {
      if (mission.points > 0) await tx.lilyLoyaltyEvent.upsert({ where: { sourceKey: `mission:${mission.id}:user:${context.user.id}` }, update: {}, create: { userId: context.user.id, type: "mission_reward", points: mission.points, sourceKey: `mission:${mission.id}:user:${context.user.id}`, metadataJson: JSON.stringify({ missionId: mission.id }) } });
      if (mission.lilyCoins > 0) await tx.lilyCoinEvent.upsert({ where: { sourceKey: `mission:${mission.id}:user:${context.user.id}` }, update: {}, create: { id: crypto.randomUUID(), userId: context.user.id, amount: mission.lilyCoins, kind: "mission", sourceKey: `mission:${mission.id}:user:${context.user.id}`, metadataJson: JSON.stringify({ missionId: mission.id }) } });
      if (mission.points > 0) await awardReachedLevelCoins(context.user.id, priorPoints, priorPoints + mission.points, tx);
    });
    return { claimed: true, pointsAwarded: mission.points, lilyCoinsAwarded: mission.lilyCoins, loyalty: await loyaltySnapshot(context.user.id) };
  });
  app.put("/api/v1/lily/admin/loyalty/levels", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = levelsSchema.parse(request.body);
    if (new Set(input.levels.map((level) => level.sortOrder)).size !== input.levels.length) throw new ApiError(400, "A ordem dos níveis não pode se repetir.");
    if (new Set(input.levels.map((level) => level.name.trim().toLocaleLowerCase("pt-BR"))).size !== input.levels.length) throw new ApiError(400, "Os nomes dos níveis não podem se repetir.");
    const sorted = [...input.levels].sort((a, b) => a.sortOrder - b.sortOrder);
    if (sorted.some((level, index) => index > 0 && level.requiredPoints <= sorted[index - 1].requiredPoints)) throw new ApiError(400, "Os pontos de cada nível precisam ser maiores que os do nível anterior.");
    const before = await lilyPrisma.lilyLevel.findMany({ select: { id: true, requiredPoints: true, lilyCoins: true } });
    await lilyPrisma.$transaction(async (tx) => {
      for (const [index, level] of sorted.entries()) {
        const data = { name: level.name, sortOrder: index, requiredPoints: level.requiredPoints, lilyCoins: level.lilyCoins, benefitsJson: JSON.stringify(level.benefits), active: level.active };
        await tx.lilyLevel.upsert({ where: { sortOrder: index }, create: { id: level.id ?? crypto.randomUUID(), ...data }, update: data });
      }
      await tx.lilyLevel.deleteMany({ where: { sortOrder: { gte: sorted.length } } });
      await tx.lilyOperationalSettings.update({ where: { id: "default" }, data: { loyaltyRoundingMode: input.roundingMode } });
    });
    const changed = sorted.filter((level) => level.lilyCoins > 0 && !before.some((old) => old.id === level.id && old.requiredPoints === level.requiredPoints && old.lilyCoins === level.lilyCoins));
    if (changed.length) {
      const users = await lilyPrisma.lilyUser.findMany({ where: { status: "active", role: "customer" }, select: { id: true } });
      for (const user of users) {
        const snapshot = await loyaltySnapshot(user.id);
        for (const level of changed) if (snapshot.points >= level.requiredPoints) await lilyPrisma.lilyCoinEvent.upsert({ where: { sourceKey: `level:${level.id}:user:${user.id}` }, update: {}, create: { id: crypto.randomUUID(), userId: user.id, amount: level.lilyCoins, kind: "level", sourceKey: `level:${level.id}:user:${user.id}`, metadataJson: JSON.stringify({ levelId: level.id, awardedAfterConfig: true }) } });
      }
    }
    await auditLilyAdmin(actor.user.id, "configure", "loyalty-levels", "default", { count: sorted.length, roundingMode: input.roundingMode });
    return { levels: sorted.length, roundingMode: input.roundingMode };
  });
  app.post("/api/v1/lily/admin/loyalty/levels/seed", async (request) => {
    const actor = await requireLilyStaff(request, true);
    if (await lilyPrisma.lilyLevel.count()) return { seeded: false };
    await lilyPrisma.lilyLevel.createMany({ data: STARTER_LEVELS.map((name, sortOrder) => ({ id: crypto.randomUUID(), name, sortOrder, requiredPoints: sortOrder === 0 ? 0 : sortOrder === 1 ? 200 : sortOrder === 20 ? 10000000 : 200 + (sortOrder - 1) * 200, lilyCoins: 0, benefitsJson: "[]", active: true })) });
    await auditLilyAdmin(actor.user.id, "seed", "loyalty-levels", "default", { count: STARTER_LEVELS.length });
    return { seeded: true, levels: STARTER_LEVELS.length };
  });
  app.get("/api/v1/lily/customer/loyalty", async (request) => {
    const context = await requireLilySession(request);
    return loyaltySnapshot(context.user.id);
  });
  app.get("/api/v1/lily/customer/loyalty/events", async (request) => {
    const context = await requireLilySession(request);
    const [points, coins] = await Promise.all([
      lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: context.user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, points: true, metadataJson: true, createdAt: true } }),
      lilyPrisma.lilyCoinEvent.findMany({ where: { userId: context.user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, amount: true, kind: true, metadataJson: true, createdAt: true } })
    ]);
    return { points, lilyCoins: coins };
  });
  app.post("/api/v1/lily/customer/loyalty/rewards/:rewardId/redeem", async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const rewardId = (request.params as { rewardId: string }).rewardId;
    const reward = await lilyPrisma.lilyReward.findFirst({ where: { id: rewardId, active: true } });
    if (!reward || reward.lilyCoinCost < 1 || reward.startsAt && reward.startsAt > new Date() || reward.endsAt && reward.endsAt <= new Date()) throw new ApiError(404, "Recompensa não disponível.");
    const snapshot = await loyaltySnapshot(context.user.id);
    if (snapshot.lilyCoins < reward.lilyCoinCost) throw new ApiError(409, "Saldo de LilyCoins insuficiente.");
    const now = new Date();
    await lilyPrisma.$transaction(async (tx) => {
      const [credits, previousRedemptions, alreadyClaimed] = await Promise.all([
        tx.lilyCoinEvent.findMany({ where: { userId: context.user.id }, select: { amount: true } }),
        tx.lilyRewardRedemption.findMany({ where: { rewardId }, select: { userId: true } }),
        tx.lilyRewardRedemption.findFirst({ where: { rewardId, userId: context.user.id } })
      ]);
      if (credits.reduce((sum, event) => sum + event.amount, 0) < reward.lilyCoinCost) throw new ApiError(409, "Saldo de LilyCoins insuficiente.");
      if (reward.maxRedemptions !== null && previousRedemptions.length >= reward.maxRedemptions) throw new ApiError(409, "Esta recompensa atingiu o limite de resgates.");
      if (alreadyClaimed) throw new ApiError(409, "Você já reivindicou esta recompensa.");
      if (reward.couponId) {
        const original = await tx.lilyCoupon.findUnique({ where: { id: reward.couponId } });
        if (!original) throw new ApiError(409, "O cupom associado não está mais disponível.");
        const assigned = await tx.lilyCoupon.create({ data: { id: crypto.randomUUID(), code: `${original.code.slice(0, 16)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, title: original.title, description: original.description, type: original.type, value: original.value, minimumOrderCents: original.minimumOrderCents, maxDiscountCents: original.maxDiscountCents, color: original.color, imageMediaId: original.imageMediaId, status: "active", startsAt: new Date(), endsAt: original.endsAt, recurrence: "none", maxUsesTotal: 1, maxUsesPerCustomer: 1, allowCombination: original.allowCombination, isAdditive: original.isAdditive, vipOnly: false, appliesToShipping: original.appliesToShipping, createdBy: "system:loyalty-reward", assignedUserId: context.user.id } });
        for (const category of await tx.lilyCouponCategory.findMany({ where: { couponId: original.id } })) await tx.lilyCouponCategory.create({ data: { couponId: assigned.id, categoryId: category.categoryId } });
        for (const product of await tx.lilyCouponProduct.findMany({ where: { couponId: original.id } })) await tx.lilyCouponProduct.create({ data: { couponId: assigned.id, productId: product.productId } });
      }
      const coinEvent = await tx.lilyCoinEvent.create({ data: { id: crypto.randomUUID(), userId: context.user.id, amount: -reward.lilyCoinCost, kind: "reward_redemption", sourceKey: `reward:${reward.id}:user:${context.user.id}:${crypto.randomUUID()}`, metadataJson: JSON.stringify({ rewardId }) } });
      await tx.lilyRewardRedemption.create({ data: { id: crypto.randomUUID(), rewardId, userId: context.user.id, coinEventId: coinEvent.id, createdAt: now } });
    });
    const createdRedemption = await lilyPrisma.lilyRewardRedemption.findFirst({ where: { rewardId, userId: context.user.id }, orderBy: { createdAt: "desc" } });
    if (createdRedemption) {
      const auditActor = await lilyPrisma.lilyAgentKey.findUnique({ where: { userId: context.user.id }, select: { id: true, fingerprint: true } });
      await lilyPrisma.lilyAdminAudit.create({ data: { actorUserId: context.user.id, actorType: auditActor ? "agent" : "human", agentKeyId: auditActor?.id ?? null, agentKeyFingerprint: auditActor?.fingerprint ?? null, action: "redeem", entityType: "loyalty-reward", entityId: reward.id, payloadJson: JSON.stringify({ redemptionId: createdRedemption.id, lilyCoinCost: reward.lilyCoinCost }) } });
    }
    return { redeemed: true, loyalty: await loyaltySnapshot(context.user.id) };
  });
}
