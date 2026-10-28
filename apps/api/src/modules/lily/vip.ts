import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getLilyOperationalSettings } from "./fulfillment";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { requireLilyCsrf, requireLilySession } from "./auth";

export const LILY_VIP_TERMS_VERSION = "cooklily-vip-2026-10-v1";
const normalizeVipCode = (value: string) => value.normalize("NFKC").replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, "").toUpperCase();
const redeemCodeSchema = z.string().min(6).max(80).transform(normalizeVipCode).pipe(z.string().min(6).max(40).regex(/^[A-Z0-9-]+$/));
const hashCode = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function isLilyVip(userId: string | null | undefined) {
  if (!userId) return false;
  const member = await lilyPrisma.lilyVipMembership.findUnique({ where: { userId }, select: { status: true } });
  return member?.status === "active";
}

export async function logLilyVipAnalytics(userId: string, event: string, reference?: string | null) {
  const settings = await getLilyOperationalSettings();
  const expiresBefore = new Date(Date.now() - settings.vipAnalyticsRetentionDays * 24 * 60 * 60 * 1000);
  await lilyPrisma.lilyVipAnalyticsEvent.deleteMany({ where: { occurredAt: { lt: expiresBefore }, user: { vipMembership: { status: "active" } } } });
  await lilyPrisma.lilyVipAnalyticsEvent.create({ data: { userId, event, reference: reference ?? null } });
}

export async function requireVipProductAccess(productId: string, userId?: string | null) {
  const product = await lilyPrisma.lilyProduct.findUnique({ where: { id: productId }, select: { vipEarlyAccess: true } });
  if (product?.vipEarlyAccess && !await isLilyVip(userId)) {
    throw new ApiError(404, "Este lançamento está disponível antecipadamente para clientes VIP.", { code: "LILY_VIP_EARLY_ACCESS" });
  }
}

async function currentPoints(userId: string) {
  const settings = await getLilyOperationalSettings();
  const [events, orders] = await Promise.all([
    lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId }, select: { points: true } }),
    lilyPrisma.lilyOrder.findMany({ where: { userId, status: { in: ["paid", "completed"] } }, select: { grandTotalCents: true, laCampaign: true } })
  ]);
  const orderPoints = orders.reduce((sum, order) => sum + Math.floor(order.grandTotalCents / Math.max(1, settings.loyaltyOrderCentsPerPoint)), 0);
  const campaigns = new Set(orders.map(({ laCampaign }) => laCampaign).filter((campaign): campaign is string => Boolean(campaign)));
  return orderPoints + events.reduce((sum, event) => sum + event.points, 0) + campaigns.size * settings.loyaltyCampaignBonusPoints;
}

function suffix(code: string) { return code.slice(-4); }
function createInviteCode() {
  const random = crypto.randomBytes(10).toString("hex").toUpperCase();
  return `LILY-${random.slice(0, 10)}-${random.slice(10)}`;
}
function assignedCouponCode(base: string) { return `${base.slice(0, 18)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; }

const adminCodeSchema = z.object({
  kind: z.enum(["vip", "coupons"]),
  couponIds: z.array(z.string().min(1).max(80)).max(20).default([]),
  startsAt: z.coerce.date().nullable().default(null),
  endsAt: z.coerce.date().nullable().default(null),
  maxRedemptions: z.number().int().min(1).max(100000).nullable().default(null)
}).strict().superRefine((value, context) => {
  if (value.kind === "coupons" && !value.couponIds.length) context.addIssue({ code: "custom", path: ["couponIds"], message: "Selecione ao menos um cupom para este código." });
  if (value.kind === "vip" && value.couponIds.length) context.addIssue({ code: "custom", path: ["couponIds"], message: "Convite VIP não recebe cupons associados." });
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "A data final deve ser posterior à inicial." });
});

const settingsSchema = z.object({ pointsThreshold: z.number().int().min(0).max(1000000).optional(), analyticsRetentionDays: z.number().int().min(30).max(3650).optional() }).strict().refine((value) => Object.keys(value).length > 0);
const statusSchema = z.object({
  status: z.enum(["active", "paused", "disabled"]),
  endsAt: z.coerce.date().nullable().optional()
}).strict();

export async function lilyVipRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/vip", async (request) => {
    await requireLilyStaff(request);
    const [settings, codes, coupons, members, events] = await Promise.all([
      getLilyOperationalSettings(),
      lilyPrisma.lilyVipCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      lilyPrisma.lilyCoupon.findMany({ where: { assignedUserId: null, status: "active" }, select: { id: true, code: true, title: true, status: true }, orderBy: { title: "asc" } }),
      lilyPrisma.lilyVipMembership.groupBy({ by: ["status"], _count: { _all: true } }),
      lilyPrisma.lilyVipAnalyticsEvent.groupBy({ by: ["event"], _count: { _all: true } })
    ]);
    return { pointsThreshold: settings.vipPointsThreshold, analyticsRetentionDays: settings.vipAnalyticsRetentionDays, codes: codes.map(({ codeHash: _hash, ...row }) => row), coupons, membershipCounts: Object.fromEntries(members.map((row) => [row.status, row._count._all])), eventStats: events.map((row) => ({ event: row.event, count: row._count._all })) };
  });

  app.patch("/api/v1/lily/admin/vip/settings", async (request) => {
    const context = await requireLilyStaff(request, true);
    const input = settingsSchema.parse(request.body);
    const updated = await lilyPrisma.lilyOperationalSettings.update({ where: { id: "default" }, data: {
      ...(input.pointsThreshold === undefined ? {} : { vipPointsThreshold: input.pointsThreshold }),
      ...(input.analyticsRetentionDays === undefined ? {} : { vipAnalyticsRetentionDays: input.analyticsRetentionDays })
    } });
    await auditLilyAdmin(context.user.id, "update", "vip-settings", "default", input);
    return { pointsThreshold: updated.vipPointsThreshold, analyticsRetentionDays: updated.vipAnalyticsRetentionDays };
  });

  app.post("/api/v1/lily/admin/vip/codes", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = adminCodeSchema.parse(request.body);
    if (input.endsAt && input.endsAt <= new Date()) throw new ApiError(400, "A validade do código precisa terminar no futuro.", { code: "LILY_VIP_CODE_EXPIRY_PAST" });
    if (input.couponIds.length) {
      const found = await lilyPrisma.lilyCoupon.findMany({ where: { id: { in: input.couponIds }, assignedUserId: null } });
      if (found.length !== new Set(input.couponIds).size) throw new ApiError(400, "Um ou mais cupons não estão disponíveis para associação.", { code: "LILY_VIP_COUPON_INVALID" });
    }
    const code = createInviteCode();
    const row = await lilyPrisma.lilyVipCode.create({ data: {
      codeHash: hashCode(code), displaySuffix: suffix(code), kind: input.kind,
      couponIdsJson: JSON.stringify(input.couponIds), startsAt: input.startsAt, endsAt: input.endsAt,
      maxRedemptions: input.maxRedemptions, createdBy: context.user.id
    } });
    await auditLilyAdmin(context.user.id, "create", "vip-code", row.id, { kind: row.kind, couponIds: input.couponIds, displaySuffix: row.displaySuffix, maxRedemptions: row.maxRedemptions });
    const { codeHash: _hash, ...safe } = row;
    return reply.code(201).send({ code, invite: safe });
  });

  app.patch("/api/v1/lily/admin/vip/codes/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: z.string().min(1).max(80) }).parse(request.params);
    const { status, endsAt } = statusSchema.parse(request.body);
    if (endsAt && endsAt <= new Date()) throw new ApiError(400, "A validade do código precisa terminar no futuro.", { code: "LILY_VIP_CODE_EXPIRY_PAST" });
    const updated = await lilyPrisma.lilyVipCode.update({ where: { id }, data: { status, ...(endsAt === undefined ? {} : { endsAt }) } });
    await auditLilyAdmin(context.user.id, "update", "vip-code", id, { status, ...(endsAt === undefined ? {} : { endsAt }) });
    const { codeHash: _hash, ...safe } = updated;
    return safe;
  });

  app.get("/api/v1/lily/customer/vip", async (request) => {
    const context = await requireLilySession(request);
    const [membership, settings, coupons, points] = await Promise.all([
      lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id } }),
      getLilyOperationalSettings(),
      lilyPrisma.lilyCoupon.findMany({ where: { assignedUserId: context.user.id, status: "active" }, select: { code: true, title: true, type: true, value: true, endsAt: true, color: true } }),
      currentPoints(context.user.id)
    ]);
    return { membership, points, pointsThreshold: settings.vipPointsThreshold, eligibleByPoints: settings.vipPointsThreshold > 0 && points >= settings.vipPointsThreshold, coupons };
  });

  app.post("/api/v1/lily/customer/vip/redeem", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { code } = z.object({ code: redeemCodeSchema }).strict().parse(request.body);
    const storedCode = await lilyPrisma.lilyVipCode.findUnique({ where: { codeHash: hashCode(code) } });
    const now = new Date();
    if (!storedCode || storedCode.status !== "active" || (storedCode.startsAt && storedCode.startsAt > now) || (storedCode.endsAt && storedCode.endsAt < now)) throw new ApiError(400, "Código inválido ou indisponível.", { code: "LILY_VIP_CODE_UNAVAILABLE" });
    const result = await lilyPrisma.$transaction(async (tx) => {
      const claimed = await tx.lilyVipCode.updateMany({ where: { id: storedCode.id, status: "active", ...(storedCode.maxRedemptions == null ? {} : { redemptionCount: { lt: storedCode.maxRedemptions } }) }, data: { redemptionCount: { increment: 1 } } });
      if (!claimed.count) throw new ApiError(409, "Este código já atingiu o limite de resgates.", { code: "LILY_VIP_CODE_EXHAUSTED" });
      try { await tx.lilyVipRedemption.create({ data: { userId: context.user.id, vipCodeId: storedCode.id } }); }
      catch { throw new ApiError(409, "Este código já foi resgatado nesta conta.", { code: "LILY_VIP_ALREADY_REDEEMED" }); }
      if (storedCode.kind === "vip") {
        const existing = await tx.lilyVipMembership.findUnique({ where: { userId: context.user.id } });
        if (existing?.status !== "active") await tx.lilyVipMembership.upsert({ where: { userId: context.user.id }, create: { userId: context.user.id, source: "invite", status: "invited" }, update: { source: "invite", status: "invited", canceledAt: null } });
      } else {
        const ids = JSON.parse(storedCode.couponIdsJson) as string[];
        for (const couponId of ids) {
          const source = await tx.lilyCoupon.findFirst({ where: { id: couponId, assignedUserId: null, status: "active", AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } });
          if (!source) throw new ApiError(409, "Um cupom associado ao código deixou de estar disponível.", { code: "LILY_VIP_COUPON_CHANGED" });
          const sourceScopes = await tx.lilyCoupon.findUnique({ where: { id: couponId }, include: { categories: true, products: true } });
          if (!sourceScopes) throw new ApiError(409, "Cupom indisponível.");
          await tx.lilyCoupon.create({ data: {
            code: assignedCouponCode(source.code), title: source.title, description: source.description, type: source.type,
            value: source.value, minimumOrderCents: source.minimumOrderCents, maxDiscountCents: source.maxDiscountCents,
            color: source.color, imageMediaId: source.imageMediaId, status: "active", startsAt: source.startsAt,
            endsAt: source.endsAt, recurrence: "none", maxUsesTotal: 1, maxUsesPerCustomer: 1,
            allowCombination: source.allowCombination, isAdditive: source.isAdditive, appliesToShipping: source.appliesToShipping,
            createdBy: context.user.id, assignedUserId: context.user.id,
            categories: { create: sourceScopes.categories.map(({ categoryId }) => ({ categoryId })) },
            products: { create: sourceScopes.products.map(({ productId }) => ({ productId })) }
          } });
        }
      }
      return { kind: storedCode.kind };
    });
    return { redeemed: true, kind: result.kind, membership: await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id } }) };
  });

  app.post("/api/v1/lily/customer/vip/claim", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const settings = await getLilyOperationalSettings();
    const points = await currentPoints(context.user.id);
    if (settings.vipPointsThreshold <= 0 || points < settings.vipPointsThreshold) throw new ApiError(403, "Você ainda não atingiu a pontuação necessária para solicitar o VIP.", { code: "LILY_VIP_POINTS_REQUIRED" });
    const current = await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id } });
    if (current?.status === "active") return { membership: current };
    const membership = await lilyPrisma.lilyVipMembership.upsert({ where: { userId: context.user.id }, create: { userId: context.user.id, source: "points", status: "invited" }, update: { source: "points", status: "invited", canceledAt: null } });
    return { membership };
  });

  app.post("/api/v1/lily/customer/vip/consent", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { version } = z.object({ version: z.literal(LILY_VIP_TERMS_VERSION) }).strict().parse(request.body);
    const membership = await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id } });
    if (!membership || membership.status === "canceled") throw new ApiError(409, "Solicite ou resgate sua elegibilidade VIP antes de consentir.", { code: "LILY_VIP_INVITATION_REQUIRED" });
    const now = new Date();
    await lilyPrisma.$transaction([
      lilyPrisma.lilyConsentRecord.create({ data: { userId: context.user.id, purpose: "vip_program_analytics", version, granted: true, source: "vip_terms", recordedAt: now } }),
      lilyPrisma.lilyVipMembership.update({ where: { userId: context.user.id }, data: { consentVersion: version, consentedAt: now } }),
    ]);
    return { consented: true, version };
  });

  app.post("/api/v1/lily/customer/vip/subscribe", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const member = await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id } });
    if (!member || member.consentVersion !== LILY_VIP_TERMS_VERSION || !member.consentedAt) throw new ApiError(403, "Leia e aceite os termos VIP vigentes antes de se inscrever.", { code: "LILY_VIP_CONSENT_REQUIRED" });
    const now = new Date();
    const active = await lilyPrisma.lilyVipMembership.update({ where: { userId: context.user.id }, data: { status: "active", enrolledAt: now, canceledAt: null } });
    await logLilyVipAnalytics(context.user.id, "vip_enrolled", active.source);
    return { membership: active };
  });

  app.post("/api/v1/lily/customer/vip/cancel", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const now = new Date();
    await lilyPrisma.$transaction([
      lilyPrisma.lilyVipMembership.updateMany({ where: { userId: context.user.id, status: "active" }, data: { status: "canceled", canceledAt: now } }),
      lilyPrisma.lilyVipMembership.updateMany({ where: { userId: context.user.id, status: "invited" }, data: { status: "canceled", canceledAt: now } }),
      lilyPrisma.lilyConsentRecord.updateMany({ where: { userId: context.user.id, purpose: "vip_program_analytics", granted: true, revokedAt: null }, data: { granted: false, revokedAt: now } }),
      lilyPrisma.lilyVipAnalyticsEvent.deleteMany({ where: { userId: context.user.id } })
    ]);
    return { canceled: true };
  });

  app.post("/api/v1/lily/customer/vip/launch-view", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { productId } = z.object({ productId: z.string().min(1).max(80) }).strict().parse(request.body);
    const member = await lilyPrisma.lilyVipMembership.findFirst({ where: { userId: context.user.id, status: "active" } });
    if (!member) throw new ApiError(403, "Acesso VIP necessário.");
    await logLilyVipAnalytics(context.user.id, "launch_view", productId);
    return { recorded: true };
  });
}
