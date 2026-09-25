import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "./auth";
import { getLilyOperationalSettings } from "./fulfillment";

const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).nullable().optional(),
  rankingOptIn: z.boolean().optional()
}).strict();

const leaderboardLimitSchema = z.coerce.number().int().min(1).max(50).default(20);

function mediaUrl(id: string | null) {
  return id ? `/api/v1/lily/public/media/${encodeURIComponent(id)}` : null;
}

function uploadRoot() {
  return process.env.LILY_UPLOAD_DIR || path.resolve(process.cwd(), ".runtime/lily-acai/uploads");
}

type LoyaltySettings = {
  loyaltyOrderCentsPerPoint: number;
  loyaltyCampaignBonusPoints: number;
};

type LoyaltyRow = {
  userId: string;
  displayName: string | null;
  avatarMediaId: string | null;
  rankingOptIn: boolean;
  createdAt: Date;
  points: number;
  orderCount: number;
  campaignCount: number;
};

async function loyaltyRows(options: { onlyOptedIn?: boolean; userIds?: string[] } = {}) {
  const settings = await getLilyOperationalSettings();
  const users = await lilyPrisma.lilyUser.findMany({
    where: {
      status: "active",
      ...(options.onlyOptedIn ? { rankingOptIn: true } : {}),
      ...(options.userIds ? { id: { in: options.userIds } } : {})
    },
    select: {
      id: true,
      displayName: true,
      avatarMediaId: true,
      rankingOptIn: true,
      createdAt: true
    }
  });

  if (!users.length) return [] as LoyaltyRow[];

  const ids = users.map((user) => user.id);
  const [orders, events] = await Promise.all([
    lilyPrisma.lilyOrder.findMany({
      where: {
        userId: { in: ids },
        status: { in: ["paid", "completed"] }
      },
      select: {
        userId: true,
        grandTotalCents: true,
        laCampaign: true
      }
    }),
    lilyPrisma.lilyLoyaltyEvent.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, points: true }
    })
  ]);

  const perPoint = Math.max(1, settings.loyaltyOrderCentsPerPoint);
  const campaignBonus = Math.max(0, settings.loyaltyCampaignBonusPoints);
  const map = new Map<string, LoyaltyRow>();
  const campaigns = new Map<string, Set<string>>();

  for (const user of users) {
    map.set(user.id, {
      userId: user.id,
      displayName: user.displayName,
      avatarMediaId: user.avatarMediaId,
      rankingOptIn: user.rankingOptIn,
      createdAt: user.createdAt,
      points: 0,
      orderCount: 0,
      campaignCount: 0
    });
    campaigns.set(user.id, new Set());
  }

  for (const order of orders) {
    if (!order.userId) continue;
    const row = map.get(order.userId);
    if (!row) continue;
    row.orderCount += 1;
    row.points += Math.floor(order.grandTotalCents / perPoint);
    if (order.laCampaign) campaigns.get(order.userId)?.add(order.laCampaign);
  }

  for (const event of events) {
    const row = map.get(event.userId);
    if (row) row.points += event.points;
  }

  for (const [userId, set] of campaigns) {
    const row = map.get(userId);
    if (!row) continue;
    row.campaignCount = set.size;
    row.points += set.size * campaignBonus;
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
    rank,
    displayName: row.displayName ?? "Cliente CookLily",
    avatarUrl: mediaUrl(row.avatarMediaId),
    points: row.points,
    orderCount: row.orderCount,
    campaignCount: row.campaignCount
  };
}

async function profilePayload(userId: string) {
  const user = await lilyPrisma.lilyUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phoneNormalized: true,
      displayName: true,
      avatarMediaId: true,
      rankingOptIn: true
    }
  });
  if (!user) throw new ApiError(404, "Perfil não encontrado.");

  const [own] = await loyaltyRows({ userIds: [userId] });
  const publicRows = await loyaltyRows({ onlyOptedIn: true });
  const publicIndex = publicRows.findIndex((row) => row.userId === userId);

  return {
    user: {
      id: user.id,
      phone: user.phoneNormalized,
      displayName: user.displayName,
      avatarUrl: mediaUrl(user.avatarMediaId),
      rankingOptIn: user.rankingOptIn
    },
    loyalty: {
      points: own?.points ?? 0,
      orderCount: own?.orderCount ?? 0,
      campaignCount: own?.campaignCount ?? 0,
      rank: publicIndex >= 0 ? publicIndex + 1 : null
    }
  };
}

export async function lilyProfileRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/loyalty/ranking", async (request) => {
    const query = z.object({ limit: leaderboardLimitSchema.optional() }).parse(request.query);
    const rows = await loyaltyRows({ onlyOptedIn: true });
    const limit = query.limit ?? 20;
    return {
      ranking: rows.slice(0, limit).map((row, index) => serializeRankingRow(row, index + 1))
    };
  });

  app.get("/api/v1/lily/customer/profile", async (request) => {
    const context = await requireLilySession(request);
    return profilePayload(context.user.id);
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

    await lilyPrisma.lilyUser.update({
      where: { id: context.user.id },
      data: {
        ...(input.displayName === undefined ? {} : { displayName }),
        ...(input.rankingOptIn === undefined ? {} : { rankingOptIn: input.rankingOptIn })
      }
    });

    return profilePayload(context.user.id);
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
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      throw new ApiError(400, "A foto deve ter no máximo 2 MB.");
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
