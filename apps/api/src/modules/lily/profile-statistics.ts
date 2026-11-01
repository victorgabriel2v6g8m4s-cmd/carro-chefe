import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getOptionalLilySession, requireLilySession } from "./auth";
import { parseLoyaltyBenefits } from "./loyalty/benefits";
import { buildWeeklyLoyaltyStats } from "./profile-statistics-periods";

const mediaUrl = (id: string | null) => id ? `/api/v1/lily/public/media/${encodeURIComponent(id)}` : null;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export async function lilyProfileStatisticsRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/loyalty/levels", async (request) => {
    const viewer = await getOptionalLilySession(request);
    const points = viewer ? (await lilyPrisma.lilyLoyaltyEvent.aggregate({ where: { userId: viewer.user.id }, _sum: { points: true } }))._sum.points ?? 0 : 0;
    const levels = await lilyPrisma.lilyLevel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, requiredPoints: true, lilyCoins: true, benefitsJson: true, iconMediaId: true } });
    const settings = await lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" }, select: { loyaltyCoinName: true, loyaltyCoinIconMediaId: true } });
    const mediaIds = [...new Set([...levels.map((level) => level.iconMediaId), settings?.loyaltyCoinIconMediaId].filter((id): id is string => Boolean(id)))];
    const media = mediaIds.length ? await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: mediaIds }, status: "active" }, select: { id: true } }) : [];
    const activeMedia = new Set(media.map((item) => item.id));
    const coinIconId = settings?.loyaltyCoinIconMediaId ?? null;
    return {
      points,
      coinName: settings?.loyaltyCoinName ?? "LilyCoins",
      coinIconUrl: coinIconId && activeMedia.has(coinIconId) ? mediaUrl(coinIconId) : null,
      levels: levels.map((level) => ({ id: level.id, name: level.name, requiredPoints: level.requiredPoints, lilyCoins: level.lilyCoins, benefits: parseLoyaltyBenefits(level.benefitsJson), iconUrl: activeMedia.has(level.iconMediaId ?? "") ? mediaUrl(level.iconMediaId) : null }))
    };
  });

  app.get("/api/v1/lily/public/loyalty/stats", async (request) => {
    const viewer = await getOptionalLilySession(request);
    const query = z.object({ userId: z.string().min(1).optional() }).parse(request.query);
    if (!query.userId && !viewer) throw new ApiError(401, "Entre na sua conta para ver suas estatísticas.");
    const targetId = query.userId ?? viewer!.user.id;
    const target = await lilyPrisma.lilyUser.findUnique({ where: { id: targetId }, select: { id: true, displayName: true, avatarMediaId: true, role: true, isTestAccount: true, rankingOptIn: true, status: true } });
    const isSelf = targetId === viewer?.user.id;
    const privileged = Boolean(viewer && (["admin", "staff"].includes(viewer.user.role) || viewer.user.isTestAccount));
    if (!target || target.status !== "active" || (!isSelf && (target.role !== "customer" || (!target.rankingOptIn && !target.isTestAccount) || (target.isTestAccount && !privileged)))) throw new ApiError(404, "Estatísticas não encontradas.");

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1); return { key: monthKey(date), label: date.toLocaleDateString("pt-BR", { month: "short" }), missions: 0, activity: 0, surveys: 0, orders: 0, referrals: 0 }; });
    const monthMap = new Map(months.map((month) => [month.key, month]));
    const monthActiveDates = new Map(months.map((month) => [month.key, new Set<string>()]));
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [events, orders, surveys, referrals, allEvents, allOrders, allSurveys, allReferrals, levels] = await Promise.all([
      lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: targetId, createdAt: { gte: from } }, select: { type: true, points: true, createdAt: true } }),
      lilyPrisma.lilyOrder.findMany({ where: { userId: targetId, status: { in: ["paid", "completed"] }, createdAt: { gte: from } }, select: { createdAt: true } }),
      lilyPrisma.lilySurveyParticipation.findMany({ where: { userId: targetId, status: "completed", completedAt: { gte: from } }, select: { completedAt: true, pointsAwarded: true } }),
      lilyPrisma.lilyReferralInvite.findMany({ where: { referrerUserId: targetId, creditedAt: { gte: from } }, select: { creditedAt: true, creditedPoints: true } }),
      lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: targetId }, select: { type: true, points: true, createdAt: true } }),
      lilyPrisma.lilyOrder.count({ where: { userId: targetId, status: { in: ["paid", "completed"] } } }),
      lilyPrisma.lilySurveyParticipation.findMany({ where: { userId: targetId, status: "completed" }, select: { pointsAwarded: true, completedAt: true } }),
      lilyPrisma.lilyReferralInvite.findMany({ where: { referrerUserId: targetId, creditedAt: { not: null } }, select: { creditedPoints: true, creditedAt: true } }),
      lilyPrisma.lilyLevel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, requiredPoints: true, iconMediaId: true } })
    ]);
    const totals = { missions: 0, activity: 0, surveys: 0, orders: 0, referrals: 0 };
    const activeDays = new Set<string>();
    for (const event of allEvents) {
      const category = event.type === "mission_reward" ? "missions" : event.type === "survey_reward" ? "surveys" : event.type === "order_purchase" || event.type === "order_refund" ? "orders" : event.type === "referral_signup" ? "referrals" : "activity";
      totals[category] += event.points;
    }
    for (const event of events) {
      const month = monthMap.get(monthKey(event.createdAt)); if (!month) continue;
      if (event.type === "mission_reward") month.missions += 1;
      if (!["mission_reward", "survey_reward", "order_purchase", "order_refund", "referral_signup"].includes(event.type)) month.activity += 1;
      const day = event.createdAt.toISOString().slice(0, 10); activeDays.add(day); monthActiveDates.get(month.key)?.add(day);
    }
    for (const order of orders) { const month = monthMap.get(monthKey(order.createdAt)); const day = order.createdAt.toISOString().slice(0, 10); if (month) month.orders += 1; activeDays.add(day); monthActiveDates.get(monthKey(order.createdAt))?.add(day); }
    for (const survey of surveys) { if (!survey.completedAt) continue; const month = monthMap.get(monthKey(survey.completedAt)); const day = survey.completedAt.toISOString().slice(0, 10); if (month) month.surveys += 1; activeDays.add(day); monthActiveDates.get(monthKey(survey.completedAt))?.add(day); }
    for (const referral of referrals) { if (!referral.creditedAt) continue; const month = monthMap.get(monthKey(referral.creditedAt)); const day = referral.creditedAt.toISOString().slice(0, 10); if (month) month.referrals += 1; activeDays.add(day); monthActiveDates.get(monthKey(referral.creditedAt))?.add(day); }
    for (const month of months) month.activity = monthActiveDates.get(month.key)?.size ?? 0;
    const points = allEvents.reduce((sum, event) => sum + event.points, 0);
    const currentLevel = [...levels].reverse().find((level) => points >= level.requiredPoints);
    const iconIsActive = currentLevel?.iconMediaId ? await lilyPrisma.lilyMediaAsset.findFirst({ where: { id: currentLevel.iconMediaId, status: "active" }, select: { id: true } }) : null;
    const days = buildWeeklyLoyaltyStats({ now, events, orders, surveys, referrals });
    return { user: { displayName: target.displayName ?? "Cliente CookLily", avatarUrl: mediaUrl(target.avatarMediaId) }, points, currentLevel: currentLevel ? { id: currentLevel.id, name: currentLevel.name, requiredPoints: currentLevel.requiredPoints, iconUrl: iconIsActive ? mediaUrl(currentLevel.iconMediaId) : null } : null, totals: { ...totals, orders: totals.orders || 0, surveys: totals.surveys || allSurveys.reduce((sum, item) => sum + item.pointsAwarded, 0), referrals: totals.referrals || allReferrals.reduce((sum, item) => sum + item.creditedPoints, 0) }, counts: { orders: allOrders, surveys: allSurveys.length, referrals: allReferrals.length }, activeDays: activeDays.size, months, days };
  });
}
