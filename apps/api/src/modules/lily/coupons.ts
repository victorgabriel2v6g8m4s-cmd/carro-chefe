import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { lilyCouponRecurrences, lilyCouponTypes } from "./coupon-calculation";
import { getOptionalLilySession } from "./auth";

const idSchema = z.string().trim().min(1).max(80);
const moneySchema = z.number().int().min(0).max(10_000_000);
const scopeSchema = {
  categoryIds: z.array(idSchema).max(100),
  productIds: z.array(idSchema).max(300)
};

const couponBaseSchema = z.object({
  code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(lilyCouponTypes),
  value: z.number().int().min(0).max(1_000_000),
  minimumOrderCents: moneySchema.default(0),
  maxDiscountCents: moneySchema.nullable().default(null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  imageMediaId: idSchema.nullable().default(null),
  status: z.enum(["draft", "active", "paused", "disabled"]),
  vipOnly: z.boolean().default(false),
  startsAt: z.coerce.date().nullable().default(null),
  endsAt: z.coerce.date().nullable().default(null),
  recurrence: z.enum(lilyCouponRecurrences).default("none"),
  maxUsesTotal: z.number().int().min(1).max(10_000_000).nullable().default(null),
  maxUsesPerCustomer: z.number().int().min(1).max(10_000).default(1),
  allowCombination: z.boolean().default(false),
  isAdditive: z.boolean().default(false),
  appliesToShipping: z.boolean().default(false),
  ...scopeSchema
}).strict();

const couponSchema = couponBaseSchema.superRefine((value, context) => {
  if (value.type === "percentage" && value.value > 10_000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "O desconto percentual não pode exceder 100%." });
  }
  if (value.type === "free_shipping" && (!value.appliesToShipping || value.value !== 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["appliesToShipping"], message: "Cupom de frete grátis deve incluir a entrega e não usa valor numérico." });
  }
  if (value.categoryIds.length === 0 && value.productIds.length === 0 && !value.appliesToShipping) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryIds"], message: "Selecione pelo menos uma categoria, produto ou frete." });
  }
  if (!value.allowCombination && value.isAdditive) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["isAdditive"], message: "Ative a combinação antes de permitir soma com outros cupons." });
  }
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "A validade final deve ser posterior à inicial." });
  }
});

const couponPatchSchema = couponBaseSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Informe ao menos um campo para atualizar o cupom." }
);

const couponInclude = {
  image: { select: { id: true, originalName: true, mime: true, status: true } },
  categories: { include: { category: { select: { id: true, name: true } } } },
  products: { include: { product: { select: { id: true, displayName: true } } } },
  _count: { select: { redemptions: true } }
} as const;

function serializeCoupon(coupon: any) {
  return {
    ...coupon,
    image: coupon.image?.status === "active" ? {
      id: coupon.image.id,
      name: coupon.image.originalName,
      url: `/api/v1/lily/public/media/${encodeURIComponent(coupon.image.id)}`
    } : null,
    categoryIds: coupon.categories.map((scope: any) => scope.category.id),
    categoryNames: coupon.categories.map((scope: any) => scope.category.name),
    productIds: coupon.products.map((scope: any) => scope.product.id),
    productNames: coupon.products.map((scope: any) => scope.product.displayName),
    redemptionCount: coupon._count.redemptions
  };
}

function scopeCreates(categoryIds: string[], productIds: string[]) {
  return {
    categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    products: { create: productIds.map((productId) => ({ productId })) }
  };
}

async function notifyCouponAudience(coupon: { id: string; code: string; title: string; value: number; type: string; vipOnly: boolean; startsAt: Date | null }) {
  if (coupon.startsAt && coupon.startsAt > new Date()) return;
  const users = await lilyPrisma.lilyUser.findMany({
    where: {
      status: "active",
      role: "customer",
      ...(coupon.vipOnly ? { vipMembership: { is: { status: "active" } } } : {})
    },
    select: { id: true }
  });
  if (!users.length) return;
  const sourceKey = `coupon:${coupon.id}:published`;
  const existing = await lilyPrisma.lilyCustomerNotification.findMany({ where: { sourceKey }, select: { userId: true } });
  const notified = new Set(existing.map(({ userId }) => userId));
  const benefit = coupon.type === "percentage" ? `${coupon.value / 100}% de desconto` : coupon.type === "fixed" ? `${(coupon.value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto` : "frete grátis";
  const data = users.filter(({ id }) => !notified.has(id)).map(({ id }) => ({
      userId: id,
      sourceKey,
      type: "coupon_available",
      title: "Um novo cupom está disponível para você",
      body: `${coupon.title}: ${benefit}. Confira as condições no seu perfil.`,
      metadataJson: JSON.stringify({ couponCode: coupon.code, href: "/lilyacai/perfil" })
    }));
  for (let offset = 0; offset < data.length; offset += 80) {
    await lilyPrisma.lilyCustomerNotification.createMany({ data: data.slice(offset, offset + 80) });
  }
}

export async function lilyCouponRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/coupons", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request) => {
    const now = new Date();
    const context = await getOptionalLilySession(request);
    const validWindow = { AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] };
    const coupons = await lilyPrisma.lilyCoupon.findMany({
      where: { status: "active", assignedUserId: null, vipOnly: false, ...validWindow },
      select: { code: true, title: true, description: true, type: true, value: true, color: true, minimumOrderCents: true, maxDiscountCents: true, startsAt: true, endsAt: true, maxUsesTotal: true, usesCount: true, image: { select: { id: true, status: true } } },
      orderBy: { updatedAt: "desc" }, take: 30
    });
    const membership = context ? await lilyPrisma.lilyVipMembership.findUnique({ where: { userId: context.user.id }, select: { status: true } }) : null;
    const assigned = context ? await lilyPrisma.lilyCoupon.findMany({ where: { status: "active", assignedUserId: context.user.id, ...validWindow }, select: { code: true, title: true, description: true, type: true, value: true, color: true, minimumOrderCents: true, maxDiscountCents: true, startsAt: true, endsAt: true, maxUsesTotal: true, usesCount: true, image: { select: { id: true, status: true } } }, orderBy: { createdAt: "desc" } }) : [];
    const vip = context && membership?.status === "active" ? await lilyPrisma.lilyCoupon.findMany({ where: { status: "active", assignedUserId: null, vipOnly: true, ...validWindow }, select: { code: true, title: true, description: true, type: true, value: true, color: true, minimumOrderCents: true, maxDiscountCents: true, startsAt: true, endsAt: true, maxUsesTotal: true, usesCount: true, image: { select: { id: true, status: true } } }, orderBy: { updatedAt: "desc" } }) : [];
    const limited = [...coupons, ...assigned.filter((coupon) => coupon.maxUsesTotal == null || coupon.usesCount < coupon.maxUsesTotal), ...(vip ?? [])].filter((coupon) => coupon.maxUsesTotal == null || coupon.usesCount < coupon.maxUsesTotal);
    return { coupons: limited.map((coupon) => ({
      code: coupon.code, title: coupon.title, description: coupon.description, type: coupon.type, value: coupon.value,
      color: coupon.color, minimumOrderCents: coupon.minimumOrderCents, maxDiscountCents: coupon.maxDiscountCents,
      startsAt: coupon.startsAt, endsAt: coupon.endsAt,
      imageUrl: coupon.image?.status === "active" ? `/api/v1/lily/public/media/${encodeURIComponent(coupon.image.id)}` : null
    })) };
  });

  app.get("/api/v1/lily/admin/coupons", async (request) => {
    await requireLilyStaff(request);
    const [coupons, categories, products, media] = await Promise.all([
      lilyPrisma.lilyCoupon.findMany({ include: couponInclude, orderBy: { updatedAt: "desc" } }),
      lilyPrisma.lilyCategory.findMany({ where: { status: { not: "disabled" } }, select: { id: true, name: true, parentId: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      lilyPrisma.lilyProduct.findMany({ select: { id: true, displayName: true, categoryId: true }, orderBy: { displayName: "asc" } }),
      lilyPrisma.lilyMediaAsset.findMany({ where: { status: "active", mime: { in: ["image/jpeg", "image/png", "image/webp"] } }, select: { id: true, originalName: true }, orderBy: { createdAt: "desc" }, take: 300 })
    ]);
    return { coupons: coupons.map(serializeCoupon), categories, products, media };
  });

  app.post("/api/v1/lily/admin/coupons", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = couponSchema.parse(request.body);
    const { categoryIds, productIds, ...data } = input;
    if (data.imageMediaId) {
      const image = await lilyPrisma.lilyMediaAsset.findFirst({ where: { id: data.imageMediaId, status: "active" } });
      if (!image || !image.mime.startsWith("image/")) throw new ApiError(400, "Selecione uma arte de cupom válida.", { code: "LILY_COUPON_IMAGE_INVALID" });
    }
    const created = await lilyPrisma.lilyCoupon.create({ data: { ...data, createdBy: context.user.id, ...scopeCreates(categoryIds, productIds) }, include: couponInclude });
    if (created.status === "active") await notifyCouponAudience(created);
    await auditLilyAdmin(context.user.id, "create", "coupon", created.id, { code: created.code, status: created.status });
    return reply.code(201).send(serializeCoupon(created));
  });

  app.patch("/api/v1/lily/admin/coupons/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const current = await lilyPrisma.lilyCoupon.findUnique({ where: { id }, include: { categories: true, products: true } });
    if (!current) throw new ApiError(404, "Cupom não encontrado.", { code: "LILY_COUPON_NOT_FOUND" });
    const parsed = couponPatchSchema.parse(request.body);
    const suppliedFields = new Set(Object.keys(request.body as Record<string, unknown>));
    const supplied = Object.fromEntries(Object.entries(parsed).filter(([key]) => suppliedFields.has(key))) as z.infer<typeof couponPatchSchema>;
    const { categoryIds, productIds, ...patch } = supplied;
    const finalValues = {
      type: patch.type ?? current.type,
      value: patch.value ?? current.value,
      appliesToShipping: patch.appliesToShipping ?? current.appliesToShipping,
      allowCombination: patch.allowCombination ?? current.allowCombination,
      isAdditive: patch.isAdditive ?? current.isAdditive,
      startsAt: patch.startsAt === undefined ? current.startsAt : patch.startsAt,
      endsAt: patch.endsAt === undefined ? current.endsAt : patch.endsAt
    };
    if (finalValues.type === "percentage" && finalValues.value > 10_000) throw new ApiError(400, "O desconto percentual não pode exceder 100%.");
    if (!finalValues.allowCombination && finalValues.isAdditive) throw new ApiError(400, "Ative a combinação antes de permitir soma com outros cupons.");
    if (finalValues.type === "free_shipping" && (!finalValues.appliesToShipping || finalValues.value !== 0)) throw new ApiError(400, "Cupom de frete grátis deve incluir a entrega e não usa valor numérico.");
    if (finalValues.startsAt && finalValues.endsAt && finalValues.startsAt > finalValues.endsAt) throw new ApiError(400, "A validade final deve ser posterior à inicial.");
    if (patch.imageMediaId) {
      const image = await lilyPrisma.lilyMediaAsset.findFirst({ where: { id: patch.imageMediaId, status: "active" } });
      if (!image || !image.mime.startsWith("image/")) throw new ApiError(400, "Selecione uma arte de cupom válida.", { code: "LILY_COUPON_IMAGE_INVALID" });
    }
    const nextCategories = categoryIds ?? current.categories.map((scope) => scope.categoryId);
    const nextProducts = productIds ?? current.products.map((scope) => scope.productId);
    if (nextCategories.length === 0 && nextProducts.length === 0 && !finalValues.appliesToShipping) throw new ApiError(400, "Selecione pelo menos uma categoria, produto ou frete.");
    const updated = await lilyPrisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) await tx.lilyCouponCategory.deleteMany({ where: { couponId: id } });
      if (productIds !== undefined) await tx.lilyCouponProduct.deleteMany({ where: { couponId: id } });
      return tx.lilyCoupon.update({
        where: { id },
        data: {
          ...patch,
          ...(categoryIds === undefined ? {} : { categories: { create: categoryIds.map((categoryId) => ({ categoryId })) } }),
          ...(productIds === undefined ? {} : { products: { create: productIds.map((productId) => ({ productId })) } })
        },
        include: couponInclude
      });
    });
    if (current.status !== "active" && updated.status === "active") await notifyCouponAudience(updated);
    await auditLilyAdmin(context.user.id, "update", "coupon", id, { fields: Object.keys(parsed), status: updated.status });
    return serializeCoupon(updated);
  });
}
