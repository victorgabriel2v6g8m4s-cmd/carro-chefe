import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getOptionalLilySession, requireLilyCsrf, requireLilySession } from "./auth";
import { isLilyVip } from "./vip";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";

const actionSchema = z.object({ productId: z.string().min(1).max(120), action: z.enum(["like", "save"]), enabled: z.boolean() }).strict();
const commentSchema = z.object({ productId: z.string().min(1).max(120), body: z.string().trim().min(1).max(500) }).strict();

async function visibleProduct(productId: string, userId?: string) {
  const product = await lilyPrisma.lilyProduct.findFirst({
    where: { id: productId, status: "published", isAvailable: true, category: { status: "published" } },
    select: { id: true, displayName: true, slug: true, vipEarlyAccess: true, coverMedia: { select: { id: true, altText: true } } }
  });
  if (!product) throw new ApiError(404, "Reel não encontrado.");
  if (product.vipEarlyAccess) {
    if (!userId || !await isLilyVip(userId)) throw new ApiError(404, "Reel não encontrado.");
  }
  return product;
}

export async function lilyReelRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/reels/:productId/social", async (request) => {
    const { productId } = z.object({ productId: z.string().min(1).max(120) }).parse(request.params);
    const viewer = await getOptionalLilySession(request);
    const product = await visibleProduct(productId, viewer?.user.id);
    const [likes, comments, liked, saved] = await Promise.all([
      lilyPrisma.lilyReelLike.count({ where: { productId } }),
      lilyPrisma.lilyReelComment.findMany({ where: { productId, status: "published" }, orderBy: { createdAt: "desc" }, take: 50 }),
      viewer ? lilyPrisma.lilyReelLike.findUnique({ where: { userId_productId: { userId: viewer.user.id, productId } } }) : null,
      viewer ? lilyPrisma.lilyReelSave.findUnique({ where: { userId_productId: { userId: viewer.user.id, productId } } }) : null
    ]);
    return { productId: product.id, likeCount: likes, liked: Boolean(liked), saved: Boolean(saved), comments: comments.map((item) => ({ id: item.id, name: "Cliente CookLily", body: item.body, createdAt: item.createdAt })) };
  });

  app.post("/api/v1/lily/customer/reels/action", { config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const input = actionSchema.parse(request.body);
    await visibleProduct(input.productId, context.user.id);
    const where = { userId_productId: { userId: context.user.id, productId: input.productId } };
    if (input.action === "like") {
      if (input.enabled) await lilyPrisma.lilyReelLike.upsert({ where, create: { userId: context.user.id, productId: input.productId }, update: {} });
      else await lilyPrisma.lilyReelLike.deleteMany({ where: { userId: context.user.id, productId: input.productId } });
    } else if (input.enabled) {
      await lilyPrisma.lilyReelSave.upsert({ where, create: { userId: context.user.id, productId: input.productId }, update: {} });
    } else {
      await lilyPrisma.lilyReelSave.deleteMany({ where: { userId: context.user.id, productId: input.productId } });
    }
    return { enabled: input.enabled };
  });

  app.post("/api/v1/lily/customer/reels/comments", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const input = commentSchema.parse(request.body);
    await visibleProduct(input.productId, context.user.id);
    const recent = await lilyPrisma.lilyReelComment.count({ where: { userId: context.user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent >= 5) throw new ApiError(429, "Você atingiu o limite temporário de comentários. Tente novamente em um minuto.");
    const comment = await lilyPrisma.lilyReelComment.create({ data: { userId: context.user.id, productId: input.productId, body: input.body } });
    return reply.code(201).send({ id: comment.id, name: "Cliente CookLily", body: comment.body, createdAt: comment.createdAt });
  });

  app.delete("/api/v1/lily/admin/reels/comments/:id", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: z.string().min(1).max(120) }).parse(request.params);
    const comment = await lilyPrisma.lilyReelComment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!comment) throw new ApiError(404, "Comentário não encontrado.");
    await lilyPrisma.lilyReelComment.update({ where: { id }, data: { status: "hidden" } });
    await auditLilyAdmin(context.user.id, "hide", "reel_comment", id, { previousStatus: comment.status });
    return reply.code(204).send();
  });

  app.get("/api/v1/lily/customer/reels/:kind", async (request) => {
    const context = await requireLilySession(request);
    const { kind } = z.object({ kind: z.enum(["liked", "saved"]) }).parse(request.params);
    const rows = kind === "liked"
      ? await lilyPrisma.lilyReelLike.findMany({ where: { userId: context.user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { include: { category: true, coverMedia: true } } } })
      : await lilyPrisma.lilyReelSave.findMany({ where: { userId: context.user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { include: { category: true, coverMedia: true } } } });
    const vip = await isLilyVip(context.user.id);
    return { reels: rows.map(({ product }) => product).filter((p) => p.status === "published" && p.isAvailable && p.category.status === "published" && (!p.vipEarlyAccess || vip)).map((p) => ({ id: p.id, slug: p.slug, title: p.displayName, category: p.category.name, coverUrl: p.coverMedia ? `/api/v1/lily/public/media/${p.coverMedia.id}` : null, altText: p.coverMedia?.altText ?? "" })) };
  });
}
