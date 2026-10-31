import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getOptionalLilySession, hashPassword, requireLilyCsrf, requireLilySession, verifyPassword } from "./auth";
import { getLilyOperationalSettings } from "./fulfillment";
import { loyaltySnapshot } from "./loyalty/service";
import { lilyProfileStatisticsRoutes } from "./profile-statistics";

export const LILY_PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).nullable().optional(),
  rankingOptIn: z.boolean().optional(),
  whatsappUpdatesOptIn: z.boolean().optional(),
  whatsappOffersOptIn: z.boolean().optional()
}).strict();

const leaderboardLimitSchema = z.coerce.number().int().min(1).max(50).default(20);

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128)
}).strict();

function mediaUrl(id: string | null) {
  return id ? `/api/v1/lily/public/media/${encodeURIComponent(id)}` : null;
}

function uploadRoot() {
  return process.env.LILY_UPLOAD_DIR || path.resolve(process.cwd(), ".runtime/lily-acai/uploads");
}

type LoyaltySettings = {
  loyaltyOrderCentsPerPoint: number;
  loyaltyCampaignBonusPoints: number;
  loyaltyRoundingMode: string;
};

type LoyaltyRow = {
  userId: string;
  displayName: string | null;
  avatarMediaId: string | null;
  rankingOptIn: boolean;
  isTestAccount: boolean;
  createdAt: Date;
  points: number;
  orderCount: number;
  campaignCount: number;
  missionCount: number;
  surveyCount: number;
  referralCount: number;
  activeDays: number;
  currentLevel: { id: string; name: string; requiredPoints: number; iconUrl: string | null } | null;
};

async function loyaltyRows(options: { onlyOptedIn?: boolean; userIds?: string[]; includeTestAccounts?: boolean; excludeTestAccounts?: boolean } = {}) {
  const users = await lilyPrisma.lilyUser.findMany({
    where: {
      status: "active",
      ...(options.onlyOptedIn ? { role: "customer" } : {}),
      ...(options.onlyOptedIn ? { ...(options.includeTestAccounts ? { OR: [{ rankingOptIn: true }, { isTestAccount: true }] } : { rankingOptIn: true }) } : {}),
      ...(options.excludeTestAccounts ? { isTestAccount: false } : {}),
      ...(options.userIds ? { id: { in: options.userIds } } : {})
    },
    select: {
      id: true,
      displayName: true,
      avatarMediaId: true,
      rankingOptIn: true,
      isTestAccount: true,
      createdAt: true
    }
  });

  if (!users.length) return [] as LoyaltyRow[];

  const ids = users.map((user) => user.id);
  const [orders, events, surveys, referrals, levels] = await Promise.all([
    lilyPrisma.lilyOrder.findMany({
      where: {
        userId: { in: ids },
        status: { in: ["paid", "completed"] }
      },
      select: {
        userId: true,
        laCampaign: true,
        createdAt: true
      }
    }),
    lilyPrisma.lilyLoyaltyEvent.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, type: true, points: true, createdAt: true }
    }),
    lilyPrisma.lilySurveyParticipation.findMany({ where: { userId: { in: ids }, status: "completed" }, select: { userId: true, completedAt: true } }),
    lilyPrisma.lilyReferralInvite.findMany({ where: { referrerUserId: { in: ids }, creditedAt: { not: null } }, select: { referrerUserId: true, creditedAt: true } }),
    lilyPrisma.lilyLevel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, requiredPoints: true, iconMediaId: true } })
  ]);

  const map = new Map<string, LoyaltyRow>();
  const campaigns = new Map<string, Set<string>>();

  for (const user of users) {
    map.set(user.id, {
      userId: user.id,
      displayName: user.displayName,
      avatarMediaId: user.avatarMediaId,
      rankingOptIn: user.rankingOptIn,
      isTestAccount: user.isTestAccount,
      createdAt: user.createdAt,
      points: 0,
      orderCount: 0,
      campaignCount: 0,
      missionCount: 0,
      surveyCount: 0,
      referralCount: 0,
      activeDays: 0,
      currentLevel: null
    });
    campaigns.set(user.id, new Set());
  }

  const activeDates = new Map<string, Set<string>>();
  for (const order of orders) {
    if (!order.userId) continue;
    const row = map.get(order.userId);
    if (!row) continue;
    row.orderCount += 1;
    const days = activeDates.get(order.userId) ?? new Set<string>(); days.add(order.createdAt.toISOString().slice(0, 10)); activeDates.set(order.userId, days);
    if (order.laCampaign) campaigns.get(order.userId)?.add(order.laCampaign);
  }

  for (const event of events) {
    const row = map.get(event.userId);
    if (!row) continue;
    row.points += event.points;
    if (event.type === "mission_reward") row.missionCount += 1;
    if (event.type === "survey_reward") row.surveyCount += 1;
    const dates = activeDates.get(event.userId) ?? new Set<string>(); dates.add(event.createdAt.toISOString().slice(0, 10)); activeDates.set(event.userId, dates);
  }
  const surveyCounts = new Map<string, number>(); for (const survey of surveys) {
    surveyCounts.set(survey.userId, (surveyCounts.get(survey.userId) ?? 0) + 1);
    if (survey.completedAt) { const dates = activeDates.get(survey.userId) ?? new Set<string>(); dates.add(survey.completedAt.toISOString().slice(0, 10)); activeDates.set(survey.userId, dates); }
  }
  for (const [userId, count] of surveyCounts) { const row = map.get(userId); if (row) row.surveyCount = Math.max(row.surveyCount, count); }
  for (const referral of referrals) {
    const row = map.get(referral.referrerUserId); if (row) row.referralCount += 1;
    if (referral.creditedAt) { const dates = activeDates.get(referral.referrerUserId) ?? new Set<string>(); dates.add(referral.creditedAt.toISOString().slice(0, 10)); activeDates.set(referral.referrerUserId, dates); }
  }
  for (const row of map.values()) {
    row.activeDays = activeDates.get(row.userId)?.size ?? 0;
    const current = [...levels].reverse().find((level) => row.points >= level.requiredPoints);
    row.currentLevel = current ? { id: current.id, name: current.name, requiredPoints: current.requiredPoints, iconUrl: mediaUrl(current.iconMediaId) } : null;
  }

  for (const [userId, set] of campaigns) {
    const row = map.get(userId);
    if (!row) continue;
    row.campaignCount = set.size;
  }

  return [...map.values()].sort((a, b) =>
    b.points - a.points
    || b.orderCount - a.orderCount
    || a.createdAt.getTime() - b.createdAt.getTime()
    || a.userId.localeCompare(b.userId)
  );
}

function serializeRankingRow(row: LoyaltyRow, rank: number) {
  return {
    userId: row.userId,
    rank,
    displayName: row.displayName ?? "Cliente CookLily",
    avatarUrl: mediaUrl(row.avatarMediaId),
    points: row.points,
    orderCount: row.orderCount,
    campaignCount: row.campaignCount,
    missionCount: row.missionCount,
    surveyCount: row.surveyCount,
    referralCount: row.referralCount,
    activeDays: row.activeDays,
    currentLevel: row.currentLevel
  };
}

function denseRanking(rows: LoyaltyRow[]) {
  const output: ReturnType<typeof serializeRankingRow>[] = [];
  let rank = 0;
  for (let index = 0; index < rows.length;) {
    const points = rows[index]!.points;
    const group: LoyaltyRow[] = [];
    while (rows[index]?.points === points) group.push(rows[index++]!);
    const real = group.filter((row) => !row.isTestAccount);
    const tests = group.filter((row) => row.isTestAccount);
    const pairedTests = new Set<string>();
    for (const row of real) {
      rank += 1;
      output.push(serializeRankingRow(row, rank));
      const test = tests.find((candidate) => !pairedTests.has(candidate.userId));
      if (test) { pairedTests.add(test.userId); output.push(serializeRankingRow(test, rank)); }
    }
    for (const test of tests) if (!pairedTests.has(test.userId)) { rank += 1; output.push(serializeRankingRow(test, rank)); }
  }
  return output;
}

function denseRankForUser(rows: LoyaltyRow[], userId: string) {
  return denseRanking(rows).find((row) => row.userId === userId)?.rank ?? null;
}

async function profilePayload(userId: string) {
  const user = await lilyPrisma.lilyUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phoneNormalized: true,
      displayName: true,
      avatarMediaId: true,
      rankingOptIn: true,
      isTestAccount: true,
      role: true
    }
  });
  if (!user) throw new ApiError(404, "Perfil não encontrado.");

  const [own] = await loyaltyRows({ userIds: [userId] });
  const loyalty = await loyaltySnapshot(userId);
  const [vipMembership, vipSettings] = await Promise.all([
    lilyPrisma.lilyVipMembership.findUnique({ where: { userId } }),
    getLilyOperationalSettings()
  ]);
  const preferenceRecords = await lilyPrisma.lilyConsentRecord.findMany({
    where: { userId, purpose: { in: ["whatsapp_order_updates", "whatsapp_offers"] } },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { purpose: true, granted: true, recordedAt: true, revokedAt: true }
  });
  const latestPreferences = new Map<string, boolean>();
  for (const record of preferenceRecords) {
    if (!latestPreferences.has(record.purpose)) {
      latestPreferences.set(record.purpose, record.granted && !record.revokedAt);
    }
  }
  const whatsappOffersOptIn = latestPreferences.get("whatsapp_offers") ?? false;
  const whatsappUpdatesOptIn = latestPreferences.get("whatsapp_order_updates") ?? true;
  const internalRanking = user.isTestAccount || ["admin", "staff"].includes(user.role);
  const publicRows = await loyaltyRows({ onlyOptedIn: true, includeTestAccounts: internalRanking, excludeTestAccounts: !internalRanking });
  const userRank = denseRankForUser(publicRows, userId);

  return {
    user: {
      id: user.id,
      phone: user.phoneNormalized,
      displayName: user.displayName,
      avatarUrl: mediaUrl(user.avatarMediaId),
      rankingOptIn: user.rankingOptIn,
      whatsappUpdatesOptIn,
      whatsappOffersOptIn,
      vipStatus: vipMembership?.status ?? null
    },
    loyalty: {
      points: own?.points ?? 0,
      orderCount: own?.orderCount ?? 0,
      campaignCount: own?.campaignCount ?? 0,
      rank: userRank,
      rankScope: internalRanking ? "internal" : "public",
      vipPointsThreshold: vipSettings.vipPointsThreshold,
      currentLevel: loyalty.currentLevel,
      nextLevel: loyalty.nextLevel,
      levelProgressPercent: loyalty.levelProgressPercent,
      lilyCoins: loyalty.lilyCoins,
      coinName: loyalty.coinName,
      coinIconUrl: loyalty.coinIconUrl
    }
  };
}

export async function lilyProfileRoutes(app: FastifyInstance) {
  await lilyProfileStatisticsRoutes(app);
  app.get("/api/v1/lily/public/loyalty/ranking", async (request) => {
    const query = z.object({ limit: leaderboardLimitSchema.optional() }).parse(request.query);
    const viewer = await getOptionalLilySession(request);
    const includeTestAccounts = Boolean(viewer && (["admin", "staff"].includes(viewer.user.role) || viewer.user.isTestAccount));
    const rows = await loyaltyRows({ onlyOptedIn: true, includeTestAccounts, excludeTestAccounts: !includeTestAccounts });
    const limit = query.limit ?? 20;
    return {
      ranking: denseRanking(rows).slice(0, limit)
    };
  });

  app.get("/api/v1/lily/customer/profile", async (request) => {
    const context = await requireLilySession(request);
    return profilePayload(context.user.id);
  });
  app.get("/api/v1/lily/customer/security/sessions", async (request) => {
    const context = await requireLilySession(request);
    const now = new Date();
    const sessions = await lilyPrisma.lilySession.findMany({
      where: {
        userId: context.user.id,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      select: {
        id: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        mfaVerifiedAt: true,
        agentKeyId: true
      },
      orderBy: { lastSeenAt: "desc" }
    });
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        current: session.id === context.session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        mfaVerified: Boolean(session.mfaVerifiedAt),
        authenticationMethod: session.agentKeyId ? "agent-key" : "password"
      }))
    };
  });

  app.post("/api/v1/lily/customer/security/sessions/revoke-others", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const revoked = await lilyPrisma.lilySession.updateMany({
      where: {
        userId: context.user.id,
        id: { not: context.session.id },
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
    return { revoked: revoked.count };
  });


  app.patch("/api/v1/lily/customer/profile", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const input = profilePatchSchema.parse(request.body);

    const current = await lilyPrisma.lilyUser.findUnique({ where: { id: context.user.id } });
    if (!current) throw new ApiError(404, "Perfil não encontrado.");

    const displayName = input.displayName === undefined
      ? current.displayName
      : (input.displayName?.trim().replace(/\s+/g, " ") || null);

    if (input.rankingOptIn === true && !displayName) {
      throw new ApiError(400, "Informe um nome antes de aparecer no ranking.", { code: "LILY_RANKING_NAME_REQUIRED" });
    }

    await lilyPrisma.$transaction(async (tx) => {
      await tx.lilyUser.update({
        where: { id: context.user.id },
        data: {
          ...(input.displayName === undefined ? {} : { displayName }),
          ...(input.rankingOptIn === undefined ? {} : { rankingOptIn: input.rankingOptIn })
        }
      });
      const recordedAt = new Date();
      const preferences: Array<{
        userId: string;
        purpose: string;
        version: string;
        granted: boolean;
        source: string;
        recordedAt: Date;
      }> = [];
      if (input.whatsappUpdatesOptIn !== undefined) {
        preferences.push({
          userId: context.user.id,
          purpose: "whatsapp_order_updates",
          version: "2026-10-08",
          granted: input.whatsappUpdatesOptIn,
          source: "profile_settings",
          recordedAt
        });
      }
      if (input.whatsappOffersOptIn !== undefined) {
        preferences.push({
          userId: context.user.id,
          purpose: "whatsapp_offers",
          version: "2026-10-08",
          granted: input.whatsappOffersOptIn,
          source: "profile_settings",
          recordedAt
        });
      }
      if (preferences.length) await tx.lilyConsentRecord.createMany({ data: preferences });
    });

    return profilePayload(context.user.id);
  });

  app.post("/api/v1/lily/customer/profile/password", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const input = passwordChangeSchema.parse(request.body);

    const current = await lilyPrisma.lilyUser.findUnique({
      where: { id: context.user.id },
      select: { id: true, passwordHash: true }
    });
    if (!current || !await verifyPassword(input.currentPassword, current.passwordHash)) {
      throw new ApiError(401, "Senha atual incorreta.", { code: "LILY_CURRENT_PASSWORD_INVALID" });
    }

    if (await verifyPassword(input.newPassword, current.passwordHash)) {
      throw new ApiError(400, "A nova senha precisa ser diferente da senha atual.", { code: "LILY_PASSWORD_REUSE" });
    }

    if (["staff", "courier", "admin"].includes(context.user.role) && input.newPassword.length < 12) {
      throw new ApiError(400, "Contas da equipe exigem senha com pelo menos 12 caracteres.", {
        code: "LILY_STAFF_PASSWORD_POLICY"
      });
    }

    const nextHash = await hashPassword(input.newPassword);
    const now = new Date();
    const [, revoked] = await lilyPrisma.$transaction([
      lilyPrisma.lilyUser.update({
        where: { id: context.user.id },
        data: {
          passwordHash: nextHash,
          ...(["staff", "courier", "admin"].includes(context.user.role)
            ? { staffPasswordUpgradeRequired: false }
            : {})
        }
      }),
      lilyPrisma.lilySession.updateMany({
        where: {
          userId: context.user.id,
          id: { not: context.session.id },
          revokedAt: null
        },
        data: { revokedAt: now }
      })
    ]);

    return {
      changed: true,
      otherSessionsRevoked: revoked.count
    };
  });

  app.post("/api/v1/lily/customer/profile/avatar", async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const part = await request.file();
    if (!part) throw new ApiError(400, "Envie uma imagem.");

    const extensionByMime: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };
    const extension = extensionByMime[part.mimetype];
    if (!extension) throw new ApiError(400, "Formato não permitido. Use JPEG, PNG ou WebP.");

    const buffer = await part.toBuffer();
    if (!buffer.length || buffer.length > LILY_PROFILE_AVATAR_MAX_BYTES) {
      throw new ApiError(400, "A foto deve ter no máximo 5 MB.");
    }

    const current = await lilyPrisma.lilyUser.findUnique({ where: { id: context.user.id } });
    if (!current) throw new ApiError(404, "Perfil não encontrado.");

    const storageName = `avatar-${crypto.randomUUID()}${extension}`;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    await fs.mkdir(uploadRoot(), { recursive: true });
    await fs.writeFile(path.join(uploadRoot(), storageName), buffer, { flag: "wx" });

    const media = await lilyPrisma.lilyMediaAsset.create({
      data: {
        storageName,
        originalName: path.basename(part.filename || "avatar"),
        mime: part.mimetype,
        size: buffer.length,
        sha256,
        altText: `Foto de perfil de ${current.displayName || "cliente CookLily"}`,
        status: "active"
      }
    });

    const oldMediaId = current.avatarMediaId;
    await lilyPrisma.lilyUser.update({
      where: { id: context.user.id },
      data: { avatarMediaId: media.id }
    });

    if (oldMediaId && oldMediaId !== media.id) {
      const old = await lilyPrisma.lilyMediaAsset.findUnique({ where: { id: oldMediaId } });
      if (old) {
        await lilyPrisma.lilyMediaAsset.update({ where: { id: old.id }, data: { status: "paused" } }).catch(() => undefined);
        await fs.unlink(path.join(uploadRoot(), old.storageName)).catch(() => undefined);
      }
    }

    return reply.code(201).send(await profilePayload(context.user.id));
  });
}
