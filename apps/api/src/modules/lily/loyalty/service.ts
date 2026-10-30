import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "../auth";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "../admin-security";
import { loyaltyBenefitSchema, parseLoyaltyBenefits } from "./benefits";

const mediaUrl = (id: string | null) => id ? `/api/v1/lily/public/media/${encodeURIComponent(id)}` : null;

export const STARTER_LEVELS = [
  "Bronze I", "Bronze II", "Bronze III", "Prata I", "Prata II", "Prata III",
  "Ouro I", "Ouro II", "Ouro III", "Ouro IV", "Platina I", "Platina II",
  "Platina III", "Platina IV", "Platina V", "Diamante I", "Diamante II",
  "Diamante III", "Diamante IV", "Mestre", "Elite"
];

export function starterLevelRows() {
  let threshold = 0;
  let previousStep = 200;
  return STARTER_LEVELS.map((name, sortOrder) => {
    if (sortOrder === 1) threshold = 200;
    else if (sortOrder > 1 && sortOrder < STARTER_LEVELS.length - 1) {
      previousStep = Math.round(previousStep * 1.66);
      threshold += previousStep;
    } else if (sortOrder === STARTER_LEVELS.length - 1) threshold = 10_000_000;
    return { id: crypto.randomUUID(), name, sortOrder, requiredPoints: threshold, lilyCoins: 0, benefits: [] as string[], active: true };
  });
}

export function roundLoyaltyPoints(value: number, mode: string) {
  return mode === "ceil" ? Math.ceil(value) : mode === "nearest" ? Math.round(value) : Math.floor(value);
}

type LoyaltyLedgerDb = Pick<typeof lilyPrisma, "lilyLoyaltyEvent" | "lilyOrder" | "lilyOperationalSettings" | "lilyLoyaltyConfigVersion" | "lilyLevel" | "lilyReward" | "lilyMission">;

export async function progressPointsForUser(userId: string, db: Pick<typeof lilyPrisma, "lilyLoyaltyEvent"> = lilyPrisma) {
  const events = await db.lilyLoyaltyEvent.findMany({ where: { userId }, select: { points: true } });
  return events.reduce((total, event) => total + event.points, 0);
}

export async function createLoyaltyConfigVersion(actorUserId: string, db: Pick<LoyaltyLedgerDb, "lilyOperationalSettings" | "lilyLevel" | "lilyReward" | "lilyMission" | "lilyLoyaltyConfigVersion"> = lilyPrisma) {
  const [settings, levels, rewards, missions, latest] = await Promise.all([
    db.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyOrderCentsPerPoint: true, loyaltyCampaignBonusPoints: true, loyaltyCouponBonusPoints: true, loyaltyRoundingMode: true, loyaltyCoinName: true, loyaltyCoinIconMediaId: true } }),
    db.lilyLevel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sortOrder: true, requiredPoints: true, lilyCoins: true, benefitsJson: true, iconMediaId: true, active: true } }),
    db.lilyReward.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true, description: true, type: true, lilyCoinCost: true, couponId: true, productId: true, active: true, startsAt: true, endsAt: true, maxRedemptions: true } }),
    db.lilyMission.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true, points: true, lilyCoins: true, status: true, prerequisiteJson: true } }),
    db.lilyLoyaltyConfigVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } })
  ]);
  if (!settings) throw new ApiError(500, "Configuração de fidelidade indisponível.");
  return db.lilyLoyaltyConfigVersion.create({ data: {
    version: (latest?.version ?? 0) + 1,
    orderCentsPerPoint: settings.loyaltyOrderCentsPerPoint,
    campaignBonusPoints: settings.loyaltyCampaignBonusPoints,
    couponBonusPoints: settings.loyaltyCouponBonusPoints,
    roundingMode: settings.loyaltyRoundingMode,
    loyaltyCoinName: settings.loyaltyCoinName,
    loyaltyCoinIconMediaId: settings.loyaltyCoinIconMediaId,
    levelsJson: JSON.stringify(levels),
    rewardsJson: JSON.stringify(rewards),
    missionsJson: JSON.stringify(missions),
    actorUserId
  } });
}

export async function recordPaidOrderPoints(userId: string, order: { id: string; grandTotalCents: number; laCampaign: string | null }, db: LoyaltyLedgerDb = lilyPrisma) {
  const [settings, config] = await Promise.all([
    db.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyOrderCentsPerPoint: true, loyaltyCampaignBonusPoints: true, loyaltyRoundingMode: true } }),
    db.lilyLoyaltyConfigVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } })
  ]);
  const configVersion = config?.version ?? 1;
  const points = roundLoyaltyPoints(order.grandTotalCents / Math.max(1, settings?.loyaltyOrderCentsPerPoint ?? 100), settings?.loyaltyRoundingMode ?? "floor");
  const event = await db.lilyLoyaltyEvent.upsert({
    where: { sourceKey: `order:${order.id}` },
    update: {},
    create: { userId, type: "order_purchase", points, sourceKey: `order:${order.id}`, configVersion, metadataJson: JSON.stringify({ configVersion, orderId: order.id }) }
  });

  if (order.laCampaign) {
    const campaignKey = `campaign:${userId}:${order.laCampaign}`;
    const activeOrders = await db.lilyOrder.count({ where: { userId, laCampaign: order.laCampaign, status: { in: ["paid", "completed"] } } });
    if (activeOrders === 1) {
      const existing = await db.lilyLoyaltyEvent.findUnique({ where: { sourceKey: campaignKey }, select: { id: true } });
      const sourceKey = existing ? `campaign-reentry:${order.id}` : campaignKey;
      await db.lilyLoyaltyEvent.upsert({
        where: { sourceKey },
        update: {},
        create: { userId, type: existing ? "campaign_reentry" : "campaign_bonus", points: settings?.loyaltyCampaignBonusPoints ?? 10, sourceKey, configVersion, metadataJson: JSON.stringify({ configVersion, campaign: order.laCampaign, orderId: order.id }) }
      });
    }
  }
  return event.points;
}

export async function reversePaidOrderPoints(userId: string, order: { id: string; laCampaign: string | null }, db: LoyaltyLedgerDb = lilyPrisma) {
  const original = await db.lilyLoyaltyEvent.findUnique({ where: { sourceKey: `order:${order.id}` } });
  if (!original) return;
  await db.lilyLoyaltyEvent.upsert({
    where: { sourceKey: `order-refund:${order.id}` },
    update: {},
    create: { userId, type: "order_refund", points: -Math.abs(original.points), sourceKey: `order-refund:${order.id}`, configVersion: original.configVersion, metadataJson: JSON.stringify({ originalEventId: original.id, orderId: order.id }) }
  });
  if (!order.laCampaign) return;
  const stillQualifies = await db.lilyOrder.count({ where: { userId, laCampaign: order.laCampaign, status: { in: ["paid", "completed"] } } });
  if (stillQualifies) return;
  const campaignKey = `campaign:${userId}:${order.laCampaign}`;
  const campaign = await db.lilyLoyaltyEvent.findUnique({ where: { sourceKey: campaignKey } });
  if (!campaign || campaign.points <= 0) return;
  await db.lilyLoyaltyEvent.upsert({
    where: { sourceKey: `campaign-refund:${order.id}` },
    update: {},
    create: { userId, type: "campaign_refund", points: -Math.abs(campaign.points), sourceKey: `campaign-refund:${order.id}`, configVersion: campaign.configVersion, metadataJson: JSON.stringify({ campaignEventId: campaign.id, orderId: order.id, campaign: order.laCampaign }) }
  });
}

export async function loyaltySnapshot(userId: string) {
  const [points, levels, settings] = await Promise.all([
    progressPointsForUser(userId),
    lilyPrisma.lilyLevel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { iconMedia: { select: { id: true, status: true } } } }),
    lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyRoundingMode: true, loyaltyCoinName: true, loyaltyCoinIconMediaId: true } })
  ]);
  const coinEvents = await lilyPrisma.lilyCoinEvent.findMany({ where: { userId }, select: { amount: true } });
  const coinIcon = settings?.loyaltyCoinIconMediaId ? await lilyPrisma.lilyMediaAsset.findFirst({ where: { id: settings.loyaltyCoinIconMediaId, status: "active" }, select: { id: true } }) : null;
  const levelIndex = levels.reduce((index, level, i) => points >= level.requiredPoints ? i : index, -1);
  const currentLevel = levelIndex >= 0 ? levels[levelIndex] : null;
  const nextLevel = levels[levelIndex + 1] ?? null;
  const lilyCoins = coinEvents.reduce((total, event) => total + event.amount, 0);
  const unlockedLevels = levels.filter((level) => points >= level.requiredPoints);
  const levelRedemptions = unlockedLevels.length ? await lilyPrisma.lilyLevelBenefitRedemption.findMany({ where: { userId, levelId: { in: unlockedLevels.map(({ id }) => id) } }, orderBy: { createdAt: "desc" }, select: { id: true, levelId: true, benefitId: true, redemptionCode: true, status: true, createdAt: true, fulfilledAt: true } }) : [];
  const rewards = await lilyPrisma.lilyReward.findMany({ where: { active: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] }, orderBy: { lilyCoinCost: "asc" } });
  const earliestReward = rewards[0];
  return {
    points, lilyCoins, coinName: settings?.loyaltyCoinName ?? "LilyCoins", coinIconUrl: mediaUrl(coinIcon?.id ?? null),
    currentLevel: currentLevel ? { id: currentLevel.id, name: currentLevel.name, requiredPoints: currentLevel.requiredPoints, lilyCoins: currentLevel.lilyCoins, iconUrl: currentLevel.iconMedia?.status === "active" ? mediaUrl(currentLevel.iconMedia.id) : null, benefits: parseLoyaltyBenefits(currentLevel.benefitsJson) } : null,
    nextLevel: nextLevel ? { id: nextLevel.id, name: nextLevel.name, requiredPoints: nextLevel.requiredPoints, lilyCoins: nextLevel.lilyCoins, iconUrl: nextLevel.iconMedia?.status === "active" ? mediaUrl(nextLevel.iconMedia.id) : null, benefits: parseLoyaltyBenefits(nextLevel.benefitsJson) } : null,
    unlockedLevels: unlockedLevels.map((level) => ({ id: level.id, name: level.name, requiredPoints: level.requiredPoints, iconUrl: level.iconMedia?.status === "active" ? mediaUrl(level.iconMedia.id) : null, benefits: parseLoyaltyBenefits(level.benefitsJson).map((benefit) => {
      const redemptions = levelRedemptions.filter((redemption) => redemption.levelId === level.id && redemption.benefitId === benefit.id);
      const maxRedemptionsPerUser = benefit.maxRedemptionsPerUser ?? 1;
      return { ...benefit, maxRedemptionsPerUser, redemptionsUsed: redemptions.length, remainingRedemptions: Math.max(0, maxRedemptionsPerUser - redemptions.length), canRedeem: redemptions.length < maxRedemptionsPerUser, redemptions: redemptions.map(({ id, redemptionCode, status, createdAt, fulfilledAt }) => ({ id, redemptionCode, status, createdAt, fulfilledAt })) };
    }) })),
    milestones: levels.map(({ id, name, requiredPoints, lilyCoins: award, iconMedia }) => ({ id, name, requiredPoints, lilyCoins: award, iconUrl: iconMedia?.status === "active" ? mediaUrl(iconMedia.id) : null, reached: points >= requiredPoints })),
    levelProgressPercent: currentLevel && nextLevel ? Math.max(0, Math.min(100, Math.round((points - currentLevel.requiredPoints) / Math.max(1, nextLevel.requiredPoints - currentLevel.requiredPoints) * 100))) : currentLevel ? 100 : 0,
    roundingMode: settings?.loyaltyRoundingMode ?? "floor",
    nextRewardTarget: earliestReward ? { title: earliestReward.title, lilyCoinCost: earliestReward.lilyCoinCost } : null,
    rewards: rewards.map(({ id, title, description, type, lilyCoinCost }) => ({ id, title, description, type, lilyCoinCost, canRedeem: lilyCoins >= lilyCoinCost }))
  };
}

export async function redeemLoyaltyLevelBenefit(userId: string, levelId: string, benefitId: string, database: Pick<typeof lilyPrisma, "$transaction"> = lilyPrisma) {
  return database.$transaction(async (tx) => {
    const [points, level] = await Promise.all([
      progressPointsForUser(userId, tx),
      tx.lilyLevel.findFirst({ where: { id: levelId, active: true } })
    ]);
    if (!level || points < level.requiredPoints) throw new ApiError(404, "Este nível ainda não está disponível para resgate.");
    const benefit = parseLoyaltyBenefits(level.benefitsJson).find(({ id }) => id === benefitId);
    if (!benefit) throw new ApiError(404, "Benefício não encontrado neste nível.");
    const used = await tx.lilyLevelBenefitRedemption.count({ where: { userId, levelId, benefitId } });
    if (used >= (benefit.maxRedemptionsPerUser ?? 1)) throw new ApiError(409, "Você já usou o limite de resgates deste benefício.");
    let couponId: string | null = null;
    let redemptionCode = `LILY-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    if (benefit.kind === "coupon" || benefit.kind === "discount") {
      const now = new Date();
      const original = await tx.lilyCoupon.findFirst({ where: { id: benefit.entityId, status: "active", assignedUserId: null, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] } });
      if (!original) throw new ApiError(409, "O cupom deste benefício não está mais disponível.");
      const coupon = await tx.lilyCoupon.create({ data: { id: crypto.randomUUID(), code: `${original.code.slice(0, 16)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, title: original.title, description: original.description, type: original.type, value: original.value, minimumOrderCents: original.minimumOrderCents, maxDiscountCents: original.maxDiscountCents, color: original.color, imageMediaId: original.imageMediaId, status: "active", startsAt: new Date(), endsAt: original.endsAt, recurrence: "none", maxUsesTotal: 1, maxUsesPerCustomer: 1, allowCombination: original.allowCombination, isAdditive: original.isAdditive, vipOnly: false, appliesToShipping: original.appliesToShipping, createdBy: "system:loyalty-level", assignedUserId: userId } });
      for (const category of await tx.lilyCouponCategory.findMany({ where: { couponId: original.id } })) await tx.lilyCouponCategory.create({ data: { couponId: coupon.id, categoryId: category.categoryId } });
      for (const product of await tx.lilyCouponProduct.findMany({ where: { couponId: original.id } })) await tx.lilyCouponProduct.create({ data: { couponId: coupon.id, productId: product.productId } });
      couponId = coupon.id;
      redemptionCode = coupon.code;
    }
    const redemption = await tx.lilyLevelBenefitRedemption.create({ data: { id: crypto.randomUUID(), userId, levelId, levelName: level.name, benefitId, benefitKind: benefit.kind, benefitLabel: benefit.label, configurationJson: JSON.stringify(benefit.configuration), redemptionCode, couponId } });
    return { id: redemption.id, levelName: level.name, benefitLabel: benefit.label, benefitKind: benefit.kind, redemptionCode, status: redemption.status, createdAt: redemption.createdAt };
  });
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

async function validateLevelBenefits(levels: Array<z.infer<typeof loyaltyLevelInputSchema>>) {
  const benefits = levels.flatMap(({ benefits }) => benefits);
  const productIds = [...new Set(benefits.filter((benefit) => benefit.kind === "product").map(({ entityId }) => entityId))];
  const couponIds = [...new Set(benefits.filter((benefit) => benefit.kind === "coupon" || benefit.kind === "discount").map(({ entityId }) => entityId))];
  const offerIds = [...new Set(benefits.filter((benefit) => benefit.kind === "offer").map(({ entityId }) => entityId))];
  const comboIds = [...new Set(benefits.filter((benefit) => benefit.kind === "combo").map(({ entityId }) => entityId))];
  const [products, coupons, offers, combos] = await Promise.all([
    lilyPrisma.lilyProduct.findMany({ where: { id: { in: productIds }, status: "published" }, select: { id: true, minimumAddonUnits: true, maximumAddonUnits: true, variants: { where: { status: "published" }, select: { id: true } }, flavorLinks: { where: { flavor: { status: "published" } }, select: { flavorId: true } }, addonLinks: { where: { allowed: true, addon: { status: "published" } }, select: { addonId: true } } } }),
    lilyPrisma.lilyCoupon.findMany({ where: { id: { in: couponIds }, status: "active", assignedUserId: null, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] }, select: { id: true } }),
    lilyPrisma.lilyOffer.findMany({ where: { id: { in: offerIds }, status: "published" }, select: { id: true } }),
    lilyPrisma.lilyCombo.findMany({
      where: { id: { in: comboIds }, status: "published" },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            product: {
              select: {
                minimumAddonUnits: true, maximumAddonUnits: true,
                variants: { where: { status: "published" }, select: { id: true } },
                flavorLinks: { where: { flavor: { status: "published" } }, select: { flavorId: true } },
                addonLinks: { where: { allowed: true, addon: { status: "published" } }, select: { addonId: true } }
              }
            }
          }
        }
      }
    })
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const comboById = new Map(combos.map((combo) => [combo.id, combo]));
  const allowedIds = {
    coupon: new Set(coupons.map(({ id }) => id)), discount: new Set(coupons.map(({ id }) => id)),
    offer: new Set(offers.map(({ id }) => id)), combo: new Set(combos.map(({ id }) => id))
  };
  for (const benefit of benefits) {
    if (benefit.kind === "product") {
      const product = productById.get(benefit.entityId);
      if (!product) throw new ApiError(400, `O produto do benefício “${benefit.label}” não está publicado.`);
      const chosen = benefit.configuration;
      if (chosen.variantIds.some((id) => !product.variants.some((variant) => variant.id === id)) || chosen.flavorIds.some((id) => !product.flavorLinks.some((link) => link.flavorId === id)) || chosen.addonIds.some((id) => !product.addonLinks.some((link) => link.addonId === id))) throw new ApiError(400, `As variações do benefício “${benefit.label}” não pertencem mais ao produto.`);
      if (benefit.selectionMode === "preset" && product.variants.length > 0 && chosen.variantIds.length !== 1) throw new ApiError(400, `Escolha um único tamanho para a combinação fixa de “${benefit.label}”.`);
      if (benefit.selectionMode === "preset" && (chosen.addonIds.length < product.minimumAddonUnits || product.maximumAddonUnits > 0 && chosen.addonIds.length > product.maximumAddonUnits)) throw new ApiError(400, `A combinação fixa de “${benefit.label}” precisa respeitar a quantidade de adicionais permitida.`);
    } else if (benefit.kind === "combo") {
      const combo = comboById.get(benefit.entityId);
      if (!combo) throw new ApiError(400, `O combo do benefício “${benefit.label}” não está publicado.`);
      if (benefit.configuration.variantIds.length || benefit.configuration.flavorIds.length || benefit.configuration.addonIds.length) throw new ApiError(400, `Configure as opções do combo “${benefit.label}” por item.`);
      const chosenItems = benefit.configuration.comboItems ?? [];
      if (benefit.selectionMode === "preset" && chosenItems.length !== combo.items.length) throw new ApiError(400, `Configure cada item do combo “${benefit.label}”.`);
      if (new Set(chosenItems.map(({ comboItemId }) => comboItemId)).size !== chosenItems.length) throw new ApiError(400, `O combo “${benefit.label}” não pode repetir itens configurados.`);
      for (const chosen of chosenItems) {
        const item = combo.items.find(({ id }) => id === chosen.comboItemId);
        if (!item) throw new ApiError(400, `Um item da configuração do combo “${benefit.label}” não está mais disponível.`);
        if (chosen.variantIds.some((id) => !item.product.variants.some((variant) => variant.id === id)) || chosen.flavorIds.some((id) => !item.product.flavorLinks.some((link) => link.flavorId === id)) || chosen.addonIds.some((id) => !item.product.addonLinks.some((link) => link.addonId === id))) throw new ApiError(400, `As variações do combo “${benefit.label}” não pertencem ao respectivo produto.`);
        if (benefit.selectionMode === "preset" && item.product.variants.length && chosen.variantIds.length !== 1) throw new ApiError(400, `Escolha um tamanho para cada item de “${benefit.label}”.`);
        if (benefit.selectionMode === "preset" && (chosen.addonIds.length < item.product.minimumAddonUnits || item.product.maximumAddonUnits > 0 && chosen.addonIds.length > item.product.maximumAddonUnits)) throw new ApiError(400, `A combinação de “${benefit.label}” precisa respeitar a quantidade de adicionais permitida.`);
      }
    } else if (benefit.kind === "user_class" && benefit.entityId !== "vip") {
      throw new ApiError(400, "A classe de usuário selecionada não está disponível.");
    } else if (benefit.kind !== "user_class" && benefit.kind !== "note" && !allowedIds[benefit.kind].has(benefit.entityId)) {
      throw new ApiError(400, `O item “${benefit.label}” não está mais disponível no catálogo.`);
    }
  }
}

const loyaltyLevelInputSchema = z.object({
  id: z.string().max(80).optional(), name: z.string().trim().min(1).max(80), sortOrder: z.number().int().min(0).max(100),
  requiredPoints: z.number().int().min(0).max(1000000000), lilyCoins: z.number().int().min(0).max(100000000),
  benefits: z.array(loyaltyBenefitSchema).max(20).default([]), iconMediaId: z.string().max(80).nullable().default(null), active: z.boolean()
}).strict();

export async function lilyLevelRoutes(app: FastifyInstance) {
  const levelsSchema = z.object({ levels: z.array(loyaltyLevelInputSchema).max(100), roundingMode: z.enum(["floor", "ceil", "nearest"]) }).strict();
  app.get("/api/v1/lily/admin/loyalty", async (request) => {
    await requireLilyStaff(request);
    const [levels, settings, rewards, missions, config, products, categories, offers, combos, coupons] = await Promise.all([
      lilyPrisma.lilyLevel.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, sortOrder: true, requiredPoints: true, lilyCoins: true, benefitsJson: true, iconMediaId: true, active: true }
      }),
      lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyRoundingMode: true, loyaltyCoinName: true, loyaltyCoinIconMediaId: true } }),
      lilyPrisma.lilyReward.findMany({ orderBy: { createdAt: "desc" } }),
      lilyPrisma.lilyMission.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, points: true, lilyCoins: true } }),
      lilyPrisma.lilyLoyaltyConfigVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } }),
      lilyPrisma.lilyProduct.findMany({ where: { status: "published" }, select: { id: true, displayName: true, slug: true, categoryId: true, category: { select: { name: true } }, minimumAddonUnits: true, maximumAddonUnits: true, variants: { where: { status: "published" }, select: { id: true, name: true, sizeMl: true } }, flavorLinks: { where: { flavor: { status: "published" } }, select: { flavor: { select: { id: true, name: true } } } }, addonLinks: { where: { allowed: true, addon: { status: "published" } }, select: { addon: { select: { id: true, name: true } } } } }, orderBy: { displayName: "asc" } }),
      lilyPrisma.lilyCategory.findMany({ where: { status: "published" }, select: { id: true, name: true, parentId: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      lilyPrisma.lilyOffer.findMany({ where: { status: "published" }, select: { id: true, name: true, productId: true, variantId: true, regularPriceCents: true, offerPriceCents: true, startsAt: true, endsAt: true }, orderBy: { name: "asc" } }),
      lilyPrisma.lilyCombo.findMany({
        where: { status: "published" },
        select: {
          id: true, name: true, description: true,
          items: {
            select: {
              id: true, quantity: true, sizeMl: true, flavorCount: true,
              product: {
                select: {
                  id: true, displayName: true, slug: true, categoryId: true, category: { select: { name: true } }, minimumAddonUnits: true, maximumAddonUnits: true,
                  variants: { where: { status: "published" }, select: { id: true, name: true, sizeMl: true } },
                  flavorLinks: { where: { flavor: { status: "published" } }, select: { flavor: { select: { id: true, name: true } } } },
                  addonLinks: { where: { allowed: true, addon: { status: "published" } }, select: { addon: { select: { id: true, name: true } } } }
                }
              }
            }
          }
        },
        orderBy: { name: "asc" }
      }),
      lilyPrisma.lilyCoupon.findMany({ where: { status: "active", assignedUserId: null }, select: { id: true, title: true, code: true, type: true, value: true }, orderBy: { title: "asc" } })
    ]);
    const mediaIds = [...new Set([settings?.loyaltyCoinIconMediaId, ...levels.map((level) => level.iconMediaId)].filter((id): id is string => Boolean(id)))];
    const media = mediaIds.length ? await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: mediaIds }, status: "active" }, select: { id: true } }) : [];
    const activeMediaIds = new Set(media.map(({ id }) => id));
    return {
      levels: levels.map(({ benefitsJson, ...row }) => ({ ...row, benefits: parseLoyaltyBenefits(benefitsJson), iconMediaId: activeMediaIds.has(row.iconMediaId ?? "") ? row.iconMediaId : null, iconUrl: activeMediaIds.has(row.iconMediaId ?? "") ? mediaUrl(row.iconMediaId) : null })),
      roundingMode: settings?.loyaltyRoundingMode ?? "floor", configVersion: config?.version ?? 0, rewards, missions,
      coupons: coupons.map(({ id, title, code }) => ({ id, title, code })), products,
      branding: { coinName: settings?.loyaltyCoinName ?? "LilyCoins", coinIconMediaId: activeMediaIds.has(settings?.loyaltyCoinIconMediaId ?? "") ? settings?.loyaltyCoinIconMediaId ?? null : null, coinIconUrl: activeMediaIds.has(settings?.loyaltyCoinIconMediaId ?? "") ? mediaUrl(settings?.loyaltyCoinIconMediaId ?? null) : null },
      benefitCatalog: {
        categories, products, coupons,
        discounts: coupons.filter((coupon) => ["percent", "percentage", "fixed", "amount"].includes(coupon.type.toLowerCase())),
        offers, combos,
        userClasses: [{ id: "vip", name: "Programa VIP", description: "Acesso à classe VIP CookLily." }]
      }
    };
  });
  app.put("/api/v1/lily/admin/loyalty/branding", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = z.object({ coinName: z.string().trim().min(1).max(32), coinIconMediaId: z.string().max(80).nullable() }).strict().parse(request.body);
    if (input.coinIconMediaId) {
      const asset = await lilyPrisma.lilyMediaAsset.findFirst({ where: { id: input.coinIconMediaId, status: "active", mime: { startsWith: "image/" } }, select: { id: true } });
      if (!asset) throw new ApiError(400, "A arte da moeda precisa ser uma imagem ativa da biblioteca CookLily.");
    }
    const saved = await lilyPrisma.$transaction(async (tx) => {
      await tx.lilyOperationalSettings.update({ where: { id: "default" }, data: { loyaltyCoinName: input.coinName, loyaltyCoinIconMediaId: input.coinIconMediaId } });
      return createLoyaltyConfigVersion(actor.user.id, tx);
    });
    await auditLilyAdmin(actor.user.id, "configure", "loyalty-branding", "default", { ...input, configVersion: saved.version });
    return { ...input, coinIconUrl: mediaUrl(input.coinIconMediaId), configVersion: saved.version };
  });
  app.get("/api/v1/lily/admin/loyalty/benefit-redemptions", async (request) => {
    await requireLilyStaff(request);
    const redemptions = await lilyPrisma.lilyLevelBenefitRedemption.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, levelName: true, benefitLabel: true, benefitKind: true, redemptionCode: true, status: true, createdAt: true, fulfilledAt: true } });
    return { redemptions };
  });
  app.patch("/api/v1/lily/admin/loyalty/benefit-redemptions/:id/fulfill", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const updated = await lilyPrisma.lilyLevelBenefitRedemption.updateMany({ where: { id, status: "claimed" }, data: { status: "fulfilled", fulfilledBy: actor.user.id, fulfilledAt: new Date() } });
    if (!updated.count) throw new ApiError(409, "Este código já foi concluído ou não está disponível.");
    const redemption = await lilyPrisma.lilyLevelBenefitRedemption.findUniqueOrThrow({ where: { id }, select: { id: true, levelName: true, benefitLabel: true, redemptionCode: true, status: true, fulfilledAt: true } });
    await auditLilyAdmin(actor.user.id, "fulfill", "loyalty-benefit-redemption", redemption.id, { redemptionCode: redemption.redemptionCode });
    return { redemption };
  });
  app.post("/api/v1/lily/admin/loyalty/rewards", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).nullable().optional(), type: z.enum(["coupon", "product"]), lilyCoinCost: z.number().int().min(1).max(100000000), couponId: z.string().max(80).nullable().optional(), productId: z.string().max(80).nullable().optional(), active: z.boolean().default(false), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), maxRedemptions: z.number().int().min(1).nullable().optional() }).strict().parse(request.body);
    if (input.type === "coupon" && !input.couponId || input.type === "product" && !input.productId) throw new ApiError(400, "Selecione o cupom ou produto da recompensa.");
    if (input.couponId && !await lilyPrisma.lilyCoupon.findUnique({ where: { id: input.couponId } })) throw new ApiError(400, "Cupom não encontrado.");
    if (input.productId && !await lilyPrisma.lilyProduct.findUnique({ where: { id: input.productId } })) throw new ApiError(400, "Produto não encontrado.");
    const reward = await lilyPrisma.lilyReward.create({ data: { id: crypto.randomUUID(), title: input.title, description: input.description ?? null, type: input.type, lilyCoinCost: input.lilyCoinCost, couponId: input.couponId ?? null, productId: input.productId ?? null, active: input.active, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, maxRedemptions: input.maxRedemptions ?? null } });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    await auditLilyAdmin(actor.user.id, "create", "loyalty-reward", reward.id, { type: reward.type, lilyCoinCost: reward.lilyCoinCost, configVersion: version.version });
    return { reward };
  });
  app.put("/api/v1/lily/admin/loyalty/rewards/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const input = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).nullable(), type: z.enum(["coupon", "product"]), lilyCoinCost: z.number().int().min(1).max(100000000), couponId: z.string().max(80).nullable(), productId: z.string().max(80).nullable(), active: z.boolean() }).strict().parse(request.body);
    if (input.type === "coupon" && !input.couponId || input.type === "product" && !input.productId) throw new ApiError(400, "Selecione o cupom ou produto da recompensa.");
    const reward = await lilyPrisma.lilyReward.update({ where: { id }, data: input });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    await auditLilyAdmin(actor.user.id, "update", "loyalty-reward", reward.id, { ...input, configVersion: version.version });
    return { reward };
  });
  app.patch("/api/v1/lily/admin/loyalty/rewards/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const input = z.object({ active: z.boolean() }).strict().parse(request.body);
    const reward = await lilyPrisma.lilyReward.update({ where: { id }, data: input });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    await auditLilyAdmin(actor.user.id, "update", "loyalty-reward", reward.id, { ...input, configVersion: version.version });
    return { reward };
  });
  app.patch("/api/v1/lily/admin/loyalty/missions/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = (request.params as { id: string }).id;
    const input = z.object({ lilyCoins: z.number().int().min(0).max(1000000) }).strict().parse(request.body);
    const mission = await lilyPrisma.lilyMission.update({ where: { id }, data: input });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    await auditLilyAdmin(actor.user.id, "update", "mission", mission.id, { ...input, configVersion: version.version });
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
  app.post("/api/v1/lily/customer/loyalty/levels/:levelId/benefits/:benefitId/redeem", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { levelId, benefitId } = z.object({ levelId: z.string().min(1).max(80), benefitId: z.string().min(1).max(100) }).parse(request.params);
    const redemption = await redeemLoyaltyLevelBenefit(context.user.id, levelId, benefitId);
    return { redeemed: true, redemption, loyalty: await loyaltySnapshot(context.user.id) };
  });
  app.put("/api/v1/lily/admin/loyalty/levels", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = levelsSchema.parse(request.body);
    if (new Set(input.levels.map((level) => level.sortOrder)).size !== input.levels.length) throw new ApiError(400, "A ordem dos níveis não pode se repetir.");
    if (new Set(input.levels.map((level) => level.name.trim().toLocaleLowerCase("pt-BR"))).size !== input.levels.length) throw new ApiError(400, "Os nomes dos níveis não podem se repetir.");
    const sorted = [...input.levels].sort((a, b) => a.sortOrder - b.sortOrder);
    if (sorted.some((level, index) => index > 0 && level.requiredPoints <= sorted[index - 1].requiredPoints)) throw new ApiError(400, "Os pontos de cada nível precisam ser maiores que os do nível anterior.");
    if (sorted.some((level) => new Set(level.benefits.map(({ id }) => id)).size !== level.benefits.length)) throw new ApiError(400, "Um nível não pode repetir o mesmo benefício.");
    await validateLevelBenefits(sorted);
    const iconIds = [...new Set(sorted.map(({ iconMediaId }) => iconMediaId).filter((id): id is string => Boolean(id)))];
    const validIcons = iconIds.length ? await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: iconIds }, status: "active", mime: { startsWith: "image/" } }, select: { id: true } }) : [];
    if (validIcons.length !== iconIds.length) throw new ApiError(400, "Cada nível precisa usar uma arte de imagem ativa da biblioteca CookLily.");
    const before = await lilyPrisma.lilyLevel.findMany({ select: { id: true, requiredPoints: true, lilyCoins: true } });
    const version = await lilyPrisma.$transaction(async (tx) => {
      for (const [index, level] of sorted.entries()) {
        const data = { name: level.name, sortOrder: index, requiredPoints: level.requiredPoints, lilyCoins: level.lilyCoins, benefitsJson: JSON.stringify(level.benefits), iconMediaId: level.iconMediaId, active: level.active };
        await tx.lilyLevel.upsert({ where: { sortOrder: index }, create: { id: level.id ?? crypto.randomUUID(), ...data }, update: data });
      }
      await tx.lilyLevel.deleteMany({ where: { sortOrder: { gte: sorted.length } } });
      await tx.lilyOperationalSettings.update({ where: { id: "default" }, data: { loyaltyRoundingMode: input.roundingMode } });
      return createLoyaltyConfigVersion(actor.user.id, tx);
    });
    const changed = sorted.filter((level) => level.lilyCoins > 0 && !before.some((old) => old.id === level.id && old.requiredPoints === level.requiredPoints && old.lilyCoins === level.lilyCoins));
    if (changed.length) {
      const users = await lilyPrisma.lilyUser.findMany({ where: { status: "active", role: "customer" }, select: { id: true } });
      for (const user of users) {
        const snapshot = await loyaltySnapshot(user.id);
        for (const level of changed) if (snapshot.points >= level.requiredPoints) await lilyPrisma.lilyCoinEvent.upsert({ where: { sourceKey: `level:${level.id}:user:${user.id}` }, update: {}, create: { id: crypto.randomUUID(), userId: user.id, amount: level.lilyCoins, kind: "level", sourceKey: `level:${level.id}:user:${user.id}`, metadataJson: JSON.stringify({ levelId: level.id, awardedAfterConfig: true }) } });
      }
    }
    await auditLilyAdmin(actor.user.id, "configure", "loyalty-levels", "default", { count: sorted.length, roundingMode: input.roundingMode, configVersion: version.version });
    return { levels: sorted.length, roundingMode: input.roundingMode, configVersion: version.version };
  });
  app.post("/api/v1/lily/admin/loyalty/levels/seed", async (request) => {
    await requireLilyStaff(request, true);
    const [storedCount, config] = await Promise.all([
      lilyPrisma.lilyLevel.count(),
      lilyPrisma.lilyLoyaltyConfigVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } })
    ]);
    if (storedCount) throw new ApiError(409, "A curva atual já está configurada.");
    return { levels: starterLevelRows(), configVersion: config?.version ?? 0 };
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
