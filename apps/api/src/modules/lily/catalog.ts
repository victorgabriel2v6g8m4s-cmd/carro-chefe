import path from "node:path";
import { promises as fs, createReadStream } from "node:fs";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { isActiveWindow, lilyConfigurationSchema, quoteLilyConfiguration } from "./configuration";

const statusSchema = z.enum(["draft", "published", "paused"]);
const activeStatusSchema = z.enum(["active", "paused"]);
const slugSchema = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idSchema = z.string().trim().min(1).max(120);
const moneySchema = z.number().int().min(0).max(10_000_000);
const sizeSchema = z.number().int().min(100).max(5000);
const marginFloorBps = 1000;

const categoryCreateSchema = z.object({
  parentId: idSchema.nullable().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(600).nullable().optional(),
  status: statusSchema.default("draft"),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  isComingSoon: z.boolean().default(false)
}).strict();

const productCreateSchema = z.object({
  categoryId: idSchema,
  slug: slugSchema,
  displayName: z.string().trim().min(2).max(120),
  descriptiveName: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().max(1600).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  configurationType: z.enum(["fixed", "lilymix"]).default("fixed"),
  status: statusSchema.default("draft"),
  isAvailable: z.boolean().default(false),
  featured: z.boolean().default(false),
  weeklyHighlight: z.boolean().default(false),
  allowPlaceholder: z.boolean().default(true),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  preparationLeadMinutes: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
  coverMediaId: idSchema.nullable().optional()
}).strict();

const variantCreateSchema = z.object({
  productId: idSchema,
  sizeMl: sizeSchema,
  name: z.string().trim().min(2).max(80),
  priceCents: moneySchema,
  compareAtPriceCents: moneySchema.nullable().optional(),
  costCents: moneySchema.nullable().optional(),
  projectedMarginBps: z.number().int().min(-10000).max(10000).nullable().optional(),
  status: statusSchema.default("draft"),
  isAvailable: z.boolean().default(false),
  sortOrder: z.number().int().min(-10000).max(10000).default(0)
}).strict();

const flavorCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  status: statusSchema.default("published"),
  premium: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  portion300: z.number().int().min(0).max(1000),
  portion500: z.number().int().min(0).max(1500),
  priceModifier300: moneySchema.default(0),
  priceModifier500: moneySchema.default(0)
}).strict();

const addonCreateSchema = z.object({
  flavorId: idSchema.nullable().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  priceCents: moneySchema,
  portion300: z.number().int().min(0).max(1000),
  portion500: z.number().int().min(0).max(1500),
  individualLimit: z.number().int().min(1).max(10).default(2),
  status: statusSchema.default("published")
}).strict();

const comboCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  rules: z.record(z.string(), z.unknown()).default({}),
  regularPriceCents: moneySchema,
  offerPriceCents: moneySchema,
  status: statusSchema.default("draft"),
  featured: z.boolean().default(false),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().min(-10000).max(10000).default(0)
}).strict();

const offerCreateSchema = z.object({
  productId: idSchema.nullable().optional(),
  variantId: idSchema.nullable().optional(),
  name: z.string().trim().min(2).max(120),
  regularPriceCents: moneySchema,
  offerPriceCents: moneySchema,
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  status: statusSchema.default("draft"),
  campaignId: z.string().trim().max(120).nullable().optional(),
  minProjectedMarginBps: z.number().int().min(0).max(10000).default(marginFloorBps)
}).strict().superRefine((value, ctx) => {
  if (!value.productId && !value.variantId) ctx.addIssue({ code: "custom", message: "Oferta precisa apontar para produto ou variante." });
  if (value.offerPriceCents >= value.regularPriceCents) ctx.addIssue({ code: "custom", message: "Preço de oferta deve ser menor que o preço regular." });
  if (value.minProjectedMarginBps < marginFloorBps) ctx.addIssue({ code: "custom", message: "Margem mínima de oferta deve ser pelo menos 10%." });
});

const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(100).optional(),
  subcategory: z.string().trim().max(100).optional(),
  flavor: z.string().trim().max(100).optional(),
  size: z.coerce.number().int().optional(),
  offer: z.enum(["true", "false"]).optional(),
  availability: z.enum(["available", "soldout", "all"]).default("all"),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(40).default(12)
});

function normalizeText(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function parseStringArray(input: string | null | undefined) {
  if (!input) return [];
  try {
    const value = JSON.parse(input);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function safeObject(input: string | null | undefined) {
  if (!input) return {};
  try {
    const value = JSON.parse(input);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function uploadRoot() {
  return path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"));
}

function mediaUrl(id: string) {
  return `/api/v1/lily/public/media/${encodeURIComponent(id)}`;
}

function assertMarginForPublish(status: string, projectedMarginBps: number | null | undefined) {
  if (status === "published" && projectedMarginBps != null && projectedMarginBps < marginFloorBps) {
    throw new ApiError(400, "Margem projetada abaixo do piso CookLily de 10%.", { code: "LILY_MARGIN_FLOOR" });
  }
}

const productInclude = {
  category: { include: { parent: true } },
  coverMedia: true,
  variants: { orderBy: [{ sortOrder: "asc" as const }, { sizeMl: "asc" as const }] },
  flavorLinks: { include: { flavor: true } },
  addonLinks: { include: { addon: { include: { flavor: true } } } },
  mediaLinks: { include: { media: true }, orderBy: { sortOrder: "asc" as const } },
  mixTiers: { orderBy: [{ sizeMl: "asc" as const }, { flavorCount: "asc" as const }] },
  offers: true
};

type ProductWithRelations = Awaited<ReturnType<typeof getProductById>>;

async function getProductById(id: string) {
  return lilyPrisma.lilyProduct.findUnique({ where: { id }, include: productInclude });
}

function serializeProduct(product: NonNullable<ProductWithRelations>) {
  const now = new Date();
  const variants = product.variants
    .filter((variant) => variant.status === "published")
    .map((variant) => ({
      id: variant.id,
      sizeMl: variant.sizeMl,
      name: variant.name,
      priceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      isAvailable: variant.isAvailable,
      projectedMarginBps: variant.projectedMarginBps
    }));
  const offers = product.offers
    .filter((offer) => offer.status === "published" && isActiveWindow(offer.startsAt, offer.endsAt, now))
    .map((offer) => ({
      id: offer.id,
      name: offer.name,
      regularPriceCents: offer.regularPriceCents,
      offerPriceCents: offer.offerPriceCents,
      savingsCents: offer.savingsCents,
      startsAt: offer.startsAt,
      endsAt: offer.endsAt
    }));
  const cover = product.coverMedia && product.coverMedia.status === "active"
    ? { id: product.coverMedia.id, url: mediaUrl(product.coverMedia.id), altText: product.coverMedia.altText }
    : null;
  const gallery = product.mediaLinks
    .filter((link) => link.media.status === "active")
    .map((link) => ({ id: link.media.id, url: mediaUrl(link.media.id), altText: link.media.altText }));
  const isPurchasable = product.isAvailable && variants.some((variant) => variant.isAvailable);
  return {
    id: product.id,
    slug: product.slug,
    displayName: product.displayName,
    descriptiveName: product.descriptiveName,
    description: product.description,
    tags: parseStringArray(product.tagsJson),
    configurationType: product.configurationType,
    status: product.status,
    isAvailable: product.isAvailable,
    isPurchasable,
    soldOut: !isPurchasable,
    featured: product.featured,
    weeklyHighlight: product.weeklyHighlight,
    allowPlaceholder: product.allowPlaceholder,
    preparationLeadMinutes: product.preparationLeadMinutes,
    sortOrder: product.sortOrder,
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: product.category.name,
      parent: product.category.parent ? {
        id: product.category.parent.id,
        slug: product.category.parent.slug,
        name: product.category.parent.name
      } : null
    },
    cover,
    gallery,
    variants,
    flavors: product.flavorLinks
      .filter((link) => link.flavor.status === "published")
      .map((link) => ({
        id: link.flavor.id,
        slug: link.flavor.slug,
        name: link.flavor.name,
        premium: link.flavor.premium,
        portion300: link.flavor.portion300,
        portion500: link.flavor.portion500,
        priceModifier300: link.flavor.priceModifier300,
        priceModifier500: link.flavor.priceModifier500
      })),
    addons: product.addonLinks
      .filter((link) => link.allowed && link.addon.status === "published")
      .map((link) => ({
        id: link.addon.id,
        slug: link.addon.slug,
        name: link.addon.name,
        priceCents: link.priceOverride ?? link.addon.priceCents,
        portion300: link.portion300 ?? link.addon.portion300,
        portion500: link.portion500 ?? link.addon.portion500,
        individualLimit: link.individualLimit ?? link.addon.individualLimit,
        flavorId: link.addon.flavorId
      })),
    mixTiers: product.mixTiers
      .filter((tier) => tier.status === "published")
      .map((tier) => ({
        id: tier.id,
        flavorCount: tier.flavorCount,
        sizeMl: tier.sizeMl,
        priceCents: tier.priceCents
      })),
    offers
  };
}

function productMatchesQuery(product: ReturnType<typeof serializeProduct>, query: z.infer<typeof catalogQuerySchema>) {
  if (query.category) {
    const wanted = normalizeText(query.category);
    const categoryMatches = normalizeText(product.category.slug) === wanted
      || normalizeText(product.category.name) === wanted
      || normalizeText(product.category.parent?.slug ?? "") === wanted
      || normalizeText(product.category.parent?.name ?? "") === wanted;
    if (!categoryMatches) return false;
  }
  if (query.subcategory) {
    const wanted = normalizeText(query.subcategory);
    if (normalizeText(product.category.slug) !== wanted && normalizeText(product.category.name) !== wanted) return false;
  }
  if (query.flavor) {
    const wanted = normalizeText(query.flavor);
    if (!product.flavors.some((flavor) => normalizeText(flavor.slug) === wanted || normalizeText(flavor.name) === wanted)) return false;
  }
  if (query.size && !product.variants.some((variant) => variant.sizeMl === query.size)) return false;
  if (query.availability === "available" && !product.isPurchasable) return false;
  if (query.availability === "soldout" && product.isPurchasable) return false;
  if (query.offer === "true" && product.offers.length === 0) return false;
  if (query.offer === "false" && product.offers.length > 0) return false;

  const prices = [
    ...product.variants.map((variant) => variant.priceCents),
    ...product.mixTiers.map((tier) => tier.priceCents)
  ];
  const minProductPrice = prices.length ? Math.min(...prices) : null;
  if (query.minPrice != null && (minProductPrice == null || minProductPrice < query.minPrice)) return false;
  if (query.maxPrice != null && (minProductPrice == null || minProductPrice > query.maxPrice)) return false;

  if (query.q) {
    const needle = normalizeText(query.q);
    const haystack = normalizeText([
      product.displayName,
      product.descriptiveName ?? "",
      product.description ?? "",
      ...product.tags,
      ...product.flavors.map((flavor) => flavor.name),
      ...product.addons.map((addon) => addon.name)
    ].join(" "));
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

async function publicCatalog(queryInput: unknown) {
  const query = catalogQuerySchema.parse(queryInput);
  const [categories, rawProducts, flavors, combos] = await Promise.all([
    lilyPrisma.lilyCategory.findMany({
      where: { status: "published" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: { where: { status: "published" }, orderBy: { sortOrder: "asc" } } }
    }),
    lilyPrisma.lilyProduct.findMany({
      where: { status: "published" },
      include: productInclude,
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }]
    }),
    lilyPrisma.lilyFlavorComponent.findMany({
      where: { status: "published" },
      orderBy: { name: "asc" }
    }),
    lilyPrisma.lilyCombo.findMany({
      where: { status: "published" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const serialized = rawProducts.map(serializeProduct).filter((product) => productMatchesQuery(product, query));
  const products = serialized.slice(query.offset, query.offset + query.limit);
  const nextOffset = query.offset + products.length < serialized.length ? query.offset + products.length : null;
  const now = new Date();

  return {
    categories: categories
      .filter((category) => category.parentId === null)
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        isComingSoon: category.isComingSoon,
        children: category.children.map((child) => ({
          id: child.id,
          slug: child.slug,
          name: child.name,
          description: child.description,
          isComingSoon: child.isComingSoon
        }))
      })),
    flavors: flavors.map((flavor) => ({
      id: flavor.id,
      slug: flavor.slug,
      name: flavor.name,
      premium: flavor.premium
    })),
    combos: combos
      .filter((combo) => isActiveWindow(combo.startsAt, combo.endsAt, now))
      .map((combo) => ({
        id: combo.id,
        slug: combo.slug,
        name: combo.name,
        description: combo.description,
        rules: safeObject(combo.rulesJson),
        regularPriceCents: combo.regularPriceCents,
        offerPriceCents: combo.offerPriceCents,
        savingsCents: combo.savingsCents,
        featured: combo.featured,
        startsAt: combo.startsAt,
        endsAt: combo.endsAt
      })),
    products,
    total: serialized.length,
    offset: query.offset,
    nextOffset
  };
}

function patchObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, current]) => current !== undefined));
}

function patchFromRequest<T extends Record<string, unknown>>(parsed: T, raw: unknown) {
  const keys = new Set(
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.keys(raw as Record<string, unknown>)
      : []
  );
  return Object.fromEntries(
    Object.entries(parsed).filter(([key, current]) => keys.has(key) && current !== undefined)
  ) as Partial<T>;
}

async function projectedMarginForOffer(input: { variantId?: string | null; offerPriceCents: number }) {
  if (!input.variantId) return null;
  const variant = await lilyPrisma.lilyProductVariant.findUnique({ where: { id: input.variantId } });
  if (!variant?.costCents || input.offerPriceCents <= 0) return null;
  return Math.floor(((input.offerPriceCents - variant.costCents) / input.offerPriceCents) * 10000);
}

export async function lilyCatalogRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/catalog", async (request) => publicCatalog(request.query));
  app.get("/api/v1/lily/public/catalog/search", async (request) => publicCatalog(request.query));

  app.get("/api/v1/lily/public/products/:slug", async (request) => {
    const { slug } = z.object({ slug: slugSchema }).parse(request.params);
    const product = await lilyPrisma.lilyProduct.findUnique({
      where: { slug },
      include: productInclude
    });
    if (!product || product.status !== "published") {
      throw new ApiError(404, "Produto CookLily não encontrado.", { code: "LILY_PRODUCT_NOT_FOUND" });
    }
    return serializeProduct(product);
  });

  app.get("/api/v1/lily/public/media/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const media = await lilyPrisma.lilyMediaAsset.findUnique({ where: { id } });
    if (!media || media.status !== "active") throw new ApiError(404, "Mídia não encontrada.");
    if (path.basename(media.storageName) !== media.storageName) throw new ApiError(404, "Mídia inválida.");
    const fullPath = path.join(uploadRoot(), media.storageName);
    try {
      await fs.access(fullPath);
    } catch {
      throw new ApiError(404, "Arquivo de mídia não encontrado.");
    }
    reply.header("Cache-Control", "public, max-age=3600");
    return reply.type(media.mime).send(createReadStream(fullPath));
  });

  app.post("/api/v1/lily/public/configure-item", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request) => {
    const input = lilyConfigurationSchema.parse(request.body);
    return quoteLilyConfiguration(input);
  });

  app.get("/api/v1/lily/admin/catalog", async (request) => {
    await requireLilyStaff(request);
    const [categories, products, flavors, addons, compatibilities, combos, offers, media] = await Promise.all([
      lilyPrisma.lilyCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      lilyPrisma.lilyProduct.findMany({ include: productInclude, orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] }),
      lilyPrisma.lilyFlavorComponent.findMany({ orderBy: { name: "asc" } }),
      lilyPrisma.lilyAddon.findMany({ include: { flavor: true }, orderBy: { name: "asc" } }),
      lilyPrisma.lilyFlavorCompatibility.findMany(),
      lilyPrisma.lilyCombo.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      lilyPrisma.lilyOffer.findMany({ orderBy: { createdAt: "desc" } }),
      lilyPrisma.lilyMediaAsset.findMany({ orderBy: { createdAt: "desc" } })
    ]);
    return {
      categories,
      products: products.map((product) => ({
        ...serializeProduct(product),
        rawStatus: product.status,
        rawVariants: product.variants,
        rawFlavorIds: product.flavorLinks.map((link) => link.flavorId),
        rawAddonLinks: product.addonLinks.map((link) => ({
          addonId: link.addonId,
          allowed: link.allowed,
          individualLimit: link.individualLimit,
          priceOverride: link.priceOverride,
          portion300: link.portion300,
          portion500: link.portion500
        }))
      })),
      flavors: flavors.map((flavor) => ({ ...flavor, tags: parseStringArray(flavor.tagsJson) })),
      addons,
      compatibilities,
      combos: combos.map((combo) => ({ ...combo, rules: safeObject(combo.rulesJson) })),
      offers,
      media
    };
  });

  app.post("/api/v1/lily/admin/categories", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = categoryCreateSchema.parse(request.body);
    const created = await lilyPrisma.lilyCategory.create({ data: input });
    await auditLilyAdmin(context.user.id, "create", "category", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/categories/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = categoryCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const updated = await lilyPrisma.lilyCategory.update({ where: { id }, data: patchObject(input) });
    await auditLilyAdmin(context.user.id, "update", "category", id, input);
    return updated;
  });

  app.post("/api/v1/lily/admin/products", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = productCreateSchema.parse(request.body);
    const { tags, ...rest } = input;
    const created = await lilyPrisma.lilyProduct.create({
      data: { ...rest, tagsJson: JSON.stringify(tags) }
    });
    await auditLilyAdmin(context.user.id, "create", "product", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/products/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = productCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const { tags, ...rest } = input;
    const updated = await lilyPrisma.lilyProduct.update({
      where: { id },
      data: { ...patchObject(rest), ...(tags ? { tagsJson: JSON.stringify(tags) } : {}) }
    });
    await auditLilyAdmin(context.user.id, "update", "product", id, input);
    return updated;
  });

  app.put("/api/v1/lily/admin/products/:id/flavors", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const { flavorIds } = z.object({ flavorIds: z.array(idSchema).max(30) }).parse(request.body);
    await lilyPrisma.$transaction([
      lilyPrisma.lilyProductFlavor.deleteMany({ where: { productId: id } }),
      lilyPrisma.lilyProductFlavor.createMany({ data: [...new Set(flavorIds)].map((flavorId) => ({ productId: id, flavorId })) })
    ]);
    await auditLilyAdmin(context.user.id, "replace-flavors", "product", id, { flavorIds });
    return { ok: true };
  });

  app.put("/api/v1/lily/admin/products/:id/addons", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const body = z.object({
      addons: z.array(z.object({
        addonId: idSchema,
        allowed: z.boolean().default(true),
        individualLimit: z.number().int().min(1).max(10).nullable().optional(),
        priceOverride: moneySchema.nullable().optional(),
        portion300: z.number().int().min(0).max(1000).nullable().optional(),
        portion500: z.number().int().min(0).max(1500).nullable().optional()
      }).strict()).max(40)
    }).parse(request.body);
    await lilyPrisma.$transaction([
      lilyPrisma.lilyProductAddon.deleteMany({ where: { productId: id } }),
      lilyPrisma.lilyProductAddon.createMany({ data: body.addons.map((item) => ({ productId: id, ...item })) })
    ]);
    await auditLilyAdmin(context.user.id, "replace-addons", "product", id, body);
    return { ok: true };
  });

  app.put("/api/v1/lily/admin/products/:id/mix-tiers", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const body = z.object({
      tiers: z.array(z.object({
        flavorCount: z.number().int().min(1).max(3),
        sizeMl: sizeSchema,
        priceCents: moneySchema,
        status: statusSchema.default("published")
      }).strict()).max(12)
    }).parse(request.body);
    await lilyPrisma.$transaction([
      lilyPrisma.lilyMixPriceTier.deleteMany({ where: { productId: id } }),
      lilyPrisma.lilyMixPriceTier.createMany({
        data: body.tiers.map((tier, index) => ({ id: `tier-${id}-${tier.sizeMl}-${tier.flavorCount}-${index}`, productId: id, ...tier }))
      })
    ]);
    await auditLilyAdmin(context.user.id, "replace-mix-tiers", "product", id, body);
    return { ok: true };
  });

  app.post("/api/v1/lily/admin/variants", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = variantCreateSchema.parse(request.body);
    assertMarginForPublish(input.status, input.projectedMarginBps);
    const created = await lilyPrisma.lilyProductVariant.create({ data: input });
    await auditLilyAdmin(context.user.id, "create", "variant", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/variants/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = variantCreateSchema.partial().omit({ productId: true }).parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const current = await lilyPrisma.lilyProductVariant.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "Variante não encontrada.");
    assertMarginForPublish(input.status ?? current.status, input.projectedMarginBps ?? current.projectedMarginBps);
    const updated = await lilyPrisma.lilyProductVariant.update({ where: { id }, data: patchObject(input) });
    await auditLilyAdmin(context.user.id, "update", "variant", id, input);
    return updated;
  });

  app.post("/api/v1/lily/admin/flavors", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = flavorCreateSchema.parse(request.body);
    const { tags, ...rest } = input;
    const created = await lilyPrisma.lilyFlavorComponent.create({ data: { ...rest, tagsJson: JSON.stringify(tags) } });
    await auditLilyAdmin(context.user.id, "create", "flavor", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/flavors/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = flavorCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const { tags, ...rest } = input;
    const updated = await lilyPrisma.lilyFlavorComponent.update({
      where: { id },
      data: { ...patchObject(rest), ...(tags ? { tagsJson: JSON.stringify(tags) } : {}) }
    });
    await auditLilyAdmin(context.user.id, "update", "flavor", id, input);
    return updated;
  });

  app.put("/api/v1/lily/admin/compatibilities", async (request) => {
    const context = await requireLilyStaff(request, true);
    const input = z.object({
      flavorAId: idSchema,
      flavorBId: idSchema,
      isCompatible: z.boolean()
    }).strict().parse(request.body);
    if (input.flavorAId === input.flavorBId && !input.isCompatible) {
      throw new ApiError(400, "Um sabor deve ser compatível consigo mesmo.");
    }
    await lilyPrisma.$transaction([
      lilyPrisma.lilyFlavorCompatibility.upsert({
        where: { flavorAId_flavorBId: { flavorAId: input.flavorAId, flavorBId: input.flavorBId } },
        update: { isCompatible: input.isCompatible },
        create: input
      }),
      lilyPrisma.lilyFlavorCompatibility.upsert({
        where: { flavorAId_flavorBId: { flavorAId: input.flavorBId, flavorBId: input.flavorAId } },
        update: { isCompatible: input.isCompatible },
        create: { flavorAId: input.flavorBId, flavorBId: input.flavorAId, isCompatible: input.isCompatible }
      })
    ]);
    await auditLilyAdmin(context.user.id, "compatibility", "flavor", input.flavorAId, input);
    return { ok: true };
  });

  app.post("/api/v1/lily/admin/addons", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = addonCreateSchema.parse(request.body);
    const created = await lilyPrisma.lilyAddon.create({ data: input });
    await auditLilyAdmin(context.user.id, "create", "addon", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/addons/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = addonCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const updated = await lilyPrisma.lilyAddon.update({ where: { id }, data: patchObject(input) });
    await auditLilyAdmin(context.user.id, "update", "addon", id, input);
    return updated;
  });

  app.post("/api/v1/lily/admin/combos", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = comboCreateSchema.parse(request.body);
    if (input.offerPriceCents >= input.regularPriceCents) throw new ApiError(400, "Combo precisa ter economia real.");
    const { rules, ...rest } = input;
    const created = await lilyPrisma.lilyCombo.create({
      data: { ...rest, savingsCents: input.regularPriceCents - input.offerPriceCents, rulesJson: JSON.stringify(rules) }
    });
    await auditLilyAdmin(context.user.id, "create", "combo", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/combos/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = comboCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const current = await lilyPrisma.lilyCombo.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "Combo não encontrado.");
    const regular = input.regularPriceCents ?? current.regularPriceCents;
    const offer = input.offerPriceCents ?? current.offerPriceCents;
    if (offer >= regular) throw new ApiError(400, "Combo precisa ter economia real.");
    const { rules, ...rest } = input;
    const updated = await lilyPrisma.lilyCombo.update({
      where: { id },
      data: {
        ...patchObject(rest),
        savingsCents: regular - offer,
        ...(rules ? { rulesJson: JSON.stringify(rules) } : {})
      }
    });
    await auditLilyAdmin(context.user.id, "update", "combo", id, input);
    return updated;
  });

  app.post("/api/v1/lily/admin/offers", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = offerCreateSchema.parse(request.body);
    let productId = input.productId ?? null;
    if (input.variantId) {
      const variant = await lilyPrisma.lilyProductVariant.findUnique({ where: { id: input.variantId } });
      if (!variant) throw new ApiError(404, "Variante da oferta não encontrada.");
      if (productId && productId !== variant.productId) {
        throw new ApiError(400, "Produto e variante da oferta não correspondem.");
      }
      productId = variant.productId;
    }
    const projected = await projectedMarginForOffer(input);
    if (projected != null && projected < marginFloorBps) throw new ApiError(400, "Oferta ficaria abaixo da margem mínima de 10%.");
    const created = await lilyPrisma.lilyOffer.create({
      data: { ...input, productId, savingsCents: input.regularPriceCents - input.offerPriceCents }
    });
    await auditLilyAdmin(context.user.id, "create", "offer", created.id, input);
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/admin/offers/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const parsed = offerCreateSchema.partial().parse(request.body);
    const input = patchFromRequest(parsed, request.body);
    const current = await lilyPrisma.lilyOffer.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "Oferta não encontrada.");
    const merged = {
      variantId: input.variantId ?? current.variantId,
      offerPriceCents: input.offerPriceCents ?? current.offerPriceCents
    };
    const regular = input.regularPriceCents ?? current.regularPriceCents;
    if (merged.offerPriceCents >= regular) throw new ApiError(400, "Preço de oferta deve ser menor que o regular.");
    const projected = await projectedMarginForOffer(merged);
    if (projected != null && projected < marginFloorBps) throw new ApiError(400, "Oferta ficaria abaixo da margem mínima de 10%.");
    const updated = await lilyPrisma.lilyOffer.update({
      where: { id },
      data: {
        ...patchObject(input),
        savingsCents: regular - merged.offerPriceCents
      }
    });
    await auditLilyAdmin(context.user.id, "update", "offer", id, input);
    return updated;
  });

  app.post("/api/v1/lily/admin/media", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
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
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new ApiError(400, "Imagem vazia ou acima de 10 MB.");
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const storageName = `${crypto.randomUUID()}${extension}`;
    await fs.mkdir(uploadRoot(), { recursive: true });
    await fs.writeFile(path.join(uploadRoot(), storageName), buffer, { flag: "wx" });
    const created = await lilyPrisma.lilyMediaAsset.create({
      data: {
        storageName,
        originalName: path.basename(part.filename || "imagem"),
        mime: part.mimetype,
        size: buffer.length,
        sha256,
        altText: path.basename(part.filename || "Produto CookLily"),
        status: "active"
      }
    });
    await auditLilyAdmin(context.user.id, "upload", "media", created.id, { originalName: created.originalName, mime: created.mime, size: created.size, sha256 });
    return reply.code(201).send({ ...created, url: mediaUrl(created.id) });
  });

  app.patch("/api/v1/lily/admin/media/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = z.object({
      altText: z.string().trim().min(2).max(240).optional(),
      status: activeStatusSchema.optional(),
      placeholder: z.boolean().optional()
    }).strict().parse(request.body);
    const updated = await lilyPrisma.lilyMediaAsset.update({ where: { id }, data: patchObject(input) });
    await auditLilyAdmin(context.user.id, "update", "media", id, input);
    return { ...updated, url: mediaUrl(updated.id) };
  });
}
