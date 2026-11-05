import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../../lib/errors";
import { missionAudienceMatches, missionAudienceSchema } from "./mission-audience";
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

async function notifyMissionAudience(mission: { id: string; title: string; audienceV2Json: string; actionUrl: string | null }) {
  const audience = missionAudienceSchema.parse(JSON.parse(mission.audienceV2Json));
  const [candidates, activeVip, levels, events] = await Promise.all([
    lilyPrisma.lilyUser.findMany({ where: { role: "customer", status: "active" }, select: { id: true } }),
    lilyPrisma.lilyVipMembership.findMany({ where: { status: "active" }, select: { userId: true } }),
    lilyPrisma.lilyLevel.findMany({ where: { active: true }, select: { id: true, requiredPoints: true } }),
    lilyPrisma.lilyLoyaltyEvent.findMany({ select: { userId: true, points: true } })
  ]);
  const vipIds = new Set(activeVip.map(({ userId }) => userId));
  const pointsByUser = new Map<string, number>();
  for (const event of events) pointsByUser.set(event.userId, (pointsByUser.get(event.userId) ?? 0) + event.points);
  const recipients = candidates.filter(({ id }) => {
    const points = pointsByUser.get(id) ?? 0;
    const currentLevel = [...levels].filter((level) => points >= level.requiredPoints).sort((a, b) => b.requiredPoints - a.requiredPoints)[0];
    return missionAudienceMatches(audience, { userId: id, isVip: vipIds.has(id), levelId: currentLevel?.id ?? null });
  });
  for (const { id: userId } of recipients) {
    await lilyPrisma.lilyCustomerNotification.upsert({
      where: { userId_sourceKey: { userId, sourceKey: `mission:${mission.id}:published` } },
      update: {},
      create: { userId, sourceKey: `mission:${mission.id}:published`, type: "mission", title: "Nova missão", body: mission.title, metadataJson: JSON.stringify({ missionId: mission.id, actionUrl: mission.actionUrl }) }
    });
  }
}

export function lilyMissionPeriodKey(cadence: string, now = new Date()) {
  if (cadence === "perpetual") return "once";
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).reduce<Record<string, string>>((parts, part) => (parts[part.type] = part.value, parts), {});
  const dayKey = `${local.year}-${local.month}-${local.day}`;
  if (cadence === "daily") return dayKey;
  const date = new Date(`${dayKey}T12:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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
  const missionInputSchema = z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).nullable().optional(),
    status: z.enum(["draft", "published", "paused"]),
    points: z.number().int().min(0).max(1_000_000),
    lilyCoins: z.number().int().min(0).max(1_000_000),
    prerequisites: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
    instructions: z.array(z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().max(1000), required: z.boolean().default(false), mediaId: z.string().max(80).nullable().default(null) }).strict()).max(20).default([]),
    audience: missionAudienceSchema.default({ mode: "all", levels: [], users: [], rules: [] }),
    rewards: z.array(z.object({ kind: z.enum(["product", "combo", "coupon", "offer", "vip"]), id: z.string().trim().min(1).max(80), quantity: z.number().int().min(1).max(20).default(1) }).strict()).max(20).default([]),
    actionUrl: z.string().url().max(500).nullable().optional(),
    approvalMode: z.enum(["automatic", "manual"]),
    reviewHours: z.number().int().min(1).max(720).default(24),
    cadence: z.enum(["daily", "weekly", "perpetual"]),
    dailyLimit: z.number().int().min(1).max(100).nullable().optional(),
    weeklyLimit: z.number().int().min(1).max(500).nullable().optional(),
    monthlyLimit: z.number().int().min(1).max(1000).nullable().optional(),
    showNextPeriod: z.boolean().default(false)
  }).strict().superRefine((mission, ctx) => {
    if (mission.audience.mode === "manual" && !mission.audience.users.length) ctx.addIssue({ code: "custom", path: ["audience", "users"], message: "Selecione pelo menos uma conta para o público manual." });
    if (mission.actionUrl) {
      const url = new URL(mission.actionUrl);
      if (url.protocol !== "https:" || !["licalily.com", "www.licalily.com", "carrochefe.com"].includes(url.hostname)) ctx.addIssue({ code: "custom", path: ["actionUrl"], message: "Use um link HTTPS do site CookLily." });
    }
  });
  async function validateMissionRewardReferences(rewards: Array<{ kind: "product" | "combo" | "coupon" | "offer" | "vip"; id: string }>) {
    const idsFor = (kind: "product" | "combo" | "coupon" | "offer" | "vip") => [...new Set(rewards.filter((reward) => reward.kind === kind).map(({ id }) => id))];
    const [products, combos, coupons, offers] = await Promise.all([
      lilyPrisma.lilyProduct.findMany({ where: { id: { in: idsFor("product") }, status: "published" }, select: { id: true } }),
      lilyPrisma.lilyCombo.findMany({ where: { id: { in: idsFor("combo") }, status: "published" }, select: { id: true } }),
      lilyPrisma.lilyCoupon.findMany({ where: { id: { in: idsFor("coupon") }, status: "active", assignedUserId: null }, select: { id: true } }),
      lilyPrisma.lilyOffer.findMany({ where: { id: { in: idsFor("offer") }, status: "published" }, select: { id: true } })
    ]);
    const valid = new Map<string, Set<string>>([["product", new Set(products.map(({ id }) => id))], ["combo", new Set(combos.map(({ id }) => id))], ["coupon", new Set(coupons.map(({ id }) => id))], ["offer", new Set(offers.map(({ id }) => id))], ["vip", new Set(["vip"])] ]);
    if (rewards.some(({ kind, id }) => !valid.get(kind)?.has(id))) throw new ApiError(400, "Uma recompensa da missão está indisponível ou não existe mais no catálogo.");
  }
  app.get("/api/v1/lily/admin/loyalty", async (request) => {
    await requireLilyStaff(request);
    const [levels, settings, rewards, missions, config, products, categories, offers, combos, coupons] = await Promise.all([
      lilyPrisma.lilyLevel.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, sortOrder: true, requiredPoints: true, lilyCoins: true, benefitsJson: true, iconMediaId: true, active: true }
      }),
      lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyRoundingMode: true, loyaltyCoinName: true, loyaltyCoinIconMediaId: true } }),
      lilyPrisma.lilyReward.findMany({ orderBy: { createdAt: "desc" } }),
      lilyPrisma.lilyMission.findMany({ where: { workflowGeneration: "modern" }, orderBy: { createdAt: "desc" } }),
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
    const current = await lilyPrisma.lilyMission.findUnique({ where: { id } });
    if (!current || current.workflowGeneration !== "modern") throw new ApiError(404, "Missão não encontrada.");
    const input = missionInputSchema.partial().strict().parse({
      title: current.title, description: current.description, status: current.status, points: current.points, lilyCoins: current.lilyCoins,
      prerequisites: JSON.parse(current.prerequisiteJson), instructions: JSON.parse(current.instructionsJson),
      audience: JSON.parse(current.audienceV2Json), rewards: JSON.parse(current.rewardsJson), actionUrl: current.actionUrl,
      approvalMode: current.approvalMode, reviewHours: current.reviewHours, cadence: current.cadence,
      dailyLimit: current.dailyLimit, weeklyLimit: current.weeklyLimit, monthlyLimit: current.monthlyLimit,
      showNextPeriod: current.showNextPeriod, ...(request.body as object)
    });
    await validateMissionRewardReferences(input.rewards ?? []);
    if (input.instructions?.some((step) => step.mediaId)) {
      const ids = input.instructions.flatMap((step) => step.mediaId ? [step.mediaId] : []);
      const found = await lilyPrisma.lilyMediaAsset.count({ where: { id: { in: ids }, status: "active" } });
      if (found !== new Set(ids).size) throw new ApiError(400, "Uma mídia da missão não está ativa ou não existe.");
    }
    const mission = await lilyPrisma.lilyMission.update({ where: { id }, data: {
      ...input,
      ...(input.prerequisites ? { prerequisiteJson: JSON.stringify(input.prerequisites) } : {}),
      ...(input.instructions ? { instructionsJson: JSON.stringify(input.instructions) } : {}),
      ...(input.audience ? { audienceV2Json: JSON.stringify(input.audience) } : {}),
      ...(input.rewards ? { rewardsJson: JSON.stringify(input.rewards) } : {})
    } });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    if (current.status !== "published" && mission.status === "published") await notifyMissionAudience(mission);
    await auditLilyAdmin(actor.user.id, "update", "mission", mission.id, { ...input, configVersion: version.version });
    return { mission: { id: mission.id, title: mission.title, lilyCoins: mission.lilyCoins } };
  });
  app.post("/api/v1/lily/admin/loyalty/missions", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const input = missionInputSchema.parse(request.body);
    await validateMissionRewardReferences(input.rewards);
    if (input.instructions.some((step) => step.mediaId)) {
      const ids = input.instructions.flatMap((step) => step.mediaId ? [step.mediaId] : []);
      const found = await lilyPrisma.lilyMediaAsset.count({ where: { id: { in: ids }, status: "active" } });
      if (found !== new Set(ids).size) throw new ApiError(400, "Uma mídia da missão não está ativa ou não existe.");
    }
    if (input.audience.mode === "manual") {
      const users = await lilyPrisma.lilyUser.count({ where: { id: { in: input.audience.users }, role: "customer", status: "active" } });
      if (users !== new Set(input.audience.users).size) throw new ApiError(400, "O público manual contém conta inexistente ou inelegível.");
    }
    const mission = await lilyPrisma.lilyMission.create({ data: {
      title: input.title, description: input.description ?? null, status: input.status,
      points: input.points, lilyCoins: input.lilyCoins, prerequisiteJson: JSON.stringify(input.prerequisites),
      instructionsJson: JSON.stringify(input.instructions), audienceV2Json: JSON.stringify(input.audience), workflowGeneration: "modern", rewardsJson: JSON.stringify(input.rewards),
      actionUrl: input.actionUrl ?? null, approvalMode: input.approvalMode, reviewHours: input.reviewHours,
      cadence: input.cadence, dailyLimit: input.dailyLimit ?? null, weeklyLimit: input.weeklyLimit ?? null,
      monthlyLimit: input.monthlyLimit ?? null, showNextPeriod: input.showNextPeriod
    } });
    const version = await createLoyaltyConfigVersion(actor.user.id);
    if (mission.status === "published") await notifyMissionAudience(mission);
    await auditLilyAdmin(actor.user.id, "create", "mission", mission.id, { configVersion: version.version, status: mission.status });
    return { mission };
  });
  app.post("/api/v1/lily/customer/missions/:id/claim", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const id = (request.params as { id: string }).id;
    const mission = await lilyPrisma.lilyMission.findFirst({ where: { id, status: "published", workflowGeneration: "modern" } });
    if (!mission) throw new ApiError(404, "Missão não encontrada.");
    if (mission.approvalMode === "manual") throw new ApiError(409, "Esta missão exige envio de comprovação e análise da equipe; ela ainda não pode ser reivindicada automaticamente.", { code: "LILY_MISSION_REQUIRES_REVIEW" });
    const audience = missionAudienceSchema.parse(JSON.parse(mission.audienceV2Json));
    const membership = audience.mode === "vip" || audience.mode === "standard"
      ? await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id }, select: { status: true } })
      : null;
    if (audience.mode === "manual" && !audience.users.includes(context.user.id)
      || audience.mode === "vip" && membership?.status !== "active"
      || audience.mode === "standard" && membership?.status === "active") throw new ApiError(404, "Missão não encontrada.");
    if (audience.levels?.length) {
      const points = await progressPointsForUser(context.user.id);
      const current = await lilyPrisma.lilyLevel.findFirst({ where: { active: true, requiredPoints: { lte: points } }, orderBy: { requiredPoints: "desc" }, select: { id: true } });
      if (!current || !audience.levels.includes(current.id)) throw new ApiError(404, "Missão não encontrada.");
    }
    const currentPoints = await progressPointsForUser(context.user.id);
    const currentLevel = await lilyPrisma.lilyLevel.findFirst({ where: { active: true, requiredPoints: { lte: currentPoints } }, orderBy: { requiredPoints: "desc" }, select: { id: true } });
    if (!missionAudienceMatches(audience, { userId: context.user.id, isVip: membership?.status === "active", levelId: currentLevel?.id ?? null })) throw new ApiError(404, "Missão não encontrada.");
    const completed = await lilyPrisma.lilySurveyParticipation.findMany({ where: { userId: context.user.id, status: "completed" }, select: { surveyId: true } });
    const surveyRows = completed.length ? await lilyPrisma.lilySurvey.findMany({ where: { id: { in: completed.map(({ surveyId }) => surveyId) } }, select: { unlocksMissionsJson: true } }) : [];
    const unlockedBySurvey = surveyRows.some((row) => (JSON.parse(row.unlocksMissionsJson) as string[]).includes(id));
    const prerequisites = JSON.parse(mission.prerequisiteJson) as string[];
    const missionPrefix = `mission:${id}:user:${context.user.id}:`;
    const priorMissionClaims = await lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: context.user.id, sourceKey: { startsWith: "mission:" } }, select: { sourceKey: true } });
    const priorCoinClaims = await lilyPrisma.lilyCoinEvent.findMany({ where: { userId: context.user.id, kind: "mission", sourceKey: { startsWith: "mission:" } }, select: { sourceKey: true } });
    const claimedMissionIds = new Set([...priorMissionClaims, ...priorCoinClaims].flatMap(({ sourceKey }) => {
      if (!sourceKey) return [];
      const match = sourceKey.match(/^mission:([^:]+):user:/);
      return match ? [match[1]] : [];
    }));
    if (!unlockedBySurvey && !prerequisites.every((prerequisiteId) => completed.some(({ surveyId }) => surveyId === prerequisiteId) || claimedMissionIds.has(prerequisiteId))) throw new ApiError(403, "Conclua os requisitos desta missão primeiro.");
    const periodKey = lilyMissionPeriodKey(mission.cadence);
    const claimedKeys = new Set([...priorMissionClaims, ...priorCoinClaims].flatMap(({ sourceKey }) => sourceKey ? [sourceKey] : []));
    const matchingClaims = [...claimedKeys].filter((key) => key.startsWith(missionPrefix));
    if (mission.cadence === "perpetual" && matchingClaims.length) throw new ApiError(409, "Esta missão já foi concluída.", { code: "LILY_MISSION_ALREADY_CLAIMED" });
    const periodSourceKey = `${missionPrefix}period:${periodKey}`;
    if (claimedKeys.has(periodSourceKey)) throw new ApiError(409, "Esta missão já foi concluída neste período.", { code: "LILY_MISSION_ALREADY_CLAIMED" });
    const dayPrefix = `${missionPrefix}period:${lilyMissionPeriodKey("daily")}`;
    const weekPrefix = `${missionPrefix}period:${lilyMissionPeriodKey("weekly").slice(0, 4)}-W`;
    const monthPrefix = `${missionPrefix}period:${lilyMissionPeriodKey("daily").slice(0, 7)}`;
    const countPrefix = (prefix: string) => [...claimedKeys].filter((key) => key.startsWith(prefix)).length;
    if (mission.dailyLimit != null && countPrefix(dayPrefix) >= mission.dailyLimit
      || mission.weeklyLimit != null && countPrefix(weekPrefix) >= mission.weeklyLimit
      || mission.monthlyLimit != null && countPrefix(monthPrefix) >= mission.monthlyLimit) {
      throw new ApiError(409, "O limite de conclusões desta missão no período foi atingido.", { code: "LILY_MISSION_PERIOD_LIMIT" });
    }
    const priorPoints = mission.points > 0 ? await progressPointsForUser(context.user.id) : 0;
    await lilyPrisma.$transaction(async (tx) => {
      if (mission.points > 0) await tx.lilyLoyaltyEvent.upsert({ where: { sourceKey: periodSourceKey }, update: {}, create: { userId: context.user.id, type: "mission_reward", points: mission.points, sourceKey: periodSourceKey, metadataJson: JSON.stringify({ missionId: mission.id, periodKey }) } });
      if (mission.lilyCoins > 0) await tx.lilyCoinEvent.upsert({ where: { sourceKey: periodSourceKey }, update: {}, create: { id: crypto.randomUUID(), userId: context.user.id, amount: mission.lilyCoins, kind: "mission", sourceKey: periodSourceKey, metadataJson: JSON.stringify({ missionId: mission.id, periodKey }) } });
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
    if (new Set(input.levels.map((level) => level.id).filter((id): id is string => Boolean(id))).size !== input.levels.filter((level) => level.id).length) throw new ApiError(400, "Um nível não pode repetir o identificador de outro nível.");
    if (new Set(input.levels.map((level) => level.name.trim().toLocaleLowerCase("pt-BR"))).size !== input.levels.length) throw new ApiError(400, "Os nomes dos níveis não podem se repetir.");
    const sorted = [...input.levels].sort((a, b) => a.sortOrder - b.sortOrder);
    const duplicateThreshold = sorted.findIndex((level, index) => index > 0 && level.requiredPoints === sorted[index - 1].requiredPoints);
    if (duplicateThreshold >= 0) throw new ApiError(400, `Pontos acumulados repetidos nos níveis “${sorted[duplicateThreshold - 1].name}” e “${sorted[duplicateThreshold].name}”. Ajuste um dos valores; somente o primeiro nível pode começar com 0 pontos.`);
    const outOfOrderThreshold = sorted.findIndex((level, index) => index > 0 && level.requiredPoints < sorted[index - 1].requiredPoints);
    if (outOfOrderThreshold >= 0) throw new ApiError(400, `O nível “${sorted[outOfOrderThreshold].name}” precisa exigir mais pontos que o nível anterior “${sorted[outOfOrderThreshold - 1].name}”.`);
    if (sorted.some((level) => new Set(level.benefits.map(({ id }) => id)).size !== level.benefits.length)) throw new ApiError(400, "Um nível não pode repetir o mesmo benefício.");
    await validateLevelBenefits(sorted);
    const iconIds = [...new Set(sorted.map(({ iconMediaId }) => iconMediaId).filter((id): id is string => Boolean(id)))];
    const validIcons = iconIds.length ? await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: iconIds }, status: "active", mime: { startsWith: "image/" } }, select: { id: true } }) : [];
    if (validIcons.length !== iconIds.length) throw new ApiError(400, "Cada nível precisa usar uma arte de imagem ativa da biblioteca CookLily.");
    const before = await lilyPrisma.lilyLevel.findMany({ select: { sortOrder: true, id: true, requiredPoints: true, lilyCoins: true } });
    const existingIds = new Set(before.map(({ id }) => id));
    const saved = await lilyPrisma.$transaction(async (tx) => {
      const offset = Math.max(1000, before.reduce((max, level) => Math.max(max, level.sortOrder), -1) + sorted.length + 100);
      for (const level of before) await tx.lilyLevel.update({ where: { id: level.id }, data: { sortOrder: offset + level.sortOrder } });
      const persistedLevels: Array<{ id: string; sortOrder: number; requiredPoints: number; lilyCoins: number }> = [];
      for (const [index, level] of sorted.entries()) {
        const id = level.id && existingIds.has(level.id) ? level.id : crypto.randomUUID();
        const data = { name: level.name, sortOrder: index, requiredPoints: level.requiredPoints, lilyCoins: level.lilyCoins, benefitsJson: JSON.stringify(level.benefits), iconMediaId: level.iconMediaId, active: level.active };
        if (existingIds.has(id)) await tx.lilyLevel.update({ where: { id }, data });
        else await tx.lilyLevel.create({ data: { id, ...data } });
        persistedLevels.push({ id, sortOrder: index, requiredPoints: level.requiredPoints, lilyCoins: level.lilyCoins });
      }
      const retainedIds = persistedLevels.map(({ id }) => id);
      if (retainedIds.length) await tx.lilyLevel.deleteMany({ where: { id: { notIn: retainedIds } } });
      else await tx.lilyLevel.deleteMany();
      await tx.lilyOperationalSettings.update({ where: { id: "default" }, data: { loyaltyRoundingMode: input.roundingMode } });
      const version = await createLoyaltyConfigVersion(actor.user.id, tx);
      return { version, levels: persistedLevels };
    });
    const changed = saved.levels.filter((level) => level.lilyCoins > 0 && !before.some((old) => old.id === level.id && old.requiredPoints === level.requiredPoints && old.lilyCoins === level.lilyCoins));
    if (changed.length) {
      const users = await lilyPrisma.lilyUser.findMany({ where: { status: "active", role: "customer" }, select: { id: true } });
      for (const user of users) {
        const snapshot = await loyaltySnapshot(user.id);
        for (const level of changed) if (snapshot.points >= level.requiredPoints) await lilyPrisma.lilyCoinEvent.upsert({ where: { sourceKey: `level:${level.id}:user:${user.id}` }, update: {}, create: { id: crypto.randomUUID(), userId: user.id, amount: level.lilyCoins, kind: "level", sourceKey: `level:${level.id}:user:${user.id}`, metadataJson: JSON.stringify({ levelId: level.id, awardedAfterConfig: true }) } });
      }
    }
    await auditLilyAdmin(actor.user.id, "configure", "loyalty-levels", "default", { count: saved.levels.length, roundingMode: input.roundingMode, configVersion: saved.version.version });
    return { levels: saved.levels.length, roundingMode: input.roundingMode, configVersion: saved.version.version };
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
