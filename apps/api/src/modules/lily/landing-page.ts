import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { defaultLilyLandingPageConfig, lilyLandingPageConfigSchema, type LilyLandingPageConfig, type LilyLandingPageId } from "@carro-chefe/contracts";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { getLilyOperationalSettings } from "./fulfillment";
import { parseSocialLinks } from "./social-links";

const SETTINGS_ID = "default";
const pageOptions: Array<{ id: LilyLandingPageId; label: string; path: string }> = [
  { id: "cardapio", label: "Cardápio", path: "/cardapio" },
  { id: "ranking", label: "Ranking", path: "/ranking" },
  { id: "reels", label: "Reels", path: "/reels" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "niveis", label: "Níveis", path: "/niveis" },
  { id: "pesquisas", label: "Pesquisas", path: "/pesquisas" }
] as const;

export const landingPageSchema = lilyLandingPageConfigSchema;
export type LandingPageConfig = LilyLandingPageConfig;

export const defaultLandingPageConfig = defaultLilyLandingPageConfig;

function readConfig(input: string): LandingPageConfig {
  try {
    return landingPageSchema.parse(JSON.parse(input));
  } catch {
    return defaultLandingPageConfig;
  }
}

function mediaUrl(id: string) {
  return `/api/v1/lily/public/media/${encodeURIComponent(id)}`;
}

async function assertImageAssets(config: LandingPageConfig) {
  const ids = [...new Set([config.banner.desktopMediaId, config.banner.sameImage ? null : config.banner.mobileMediaId].filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  const found = await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true, mime: true } });
  if (found.length !== ids.length || found.some((asset) => !asset.mime.startsWith("image/"))) {
    throw new ApiError(400, "Selecione artes de imagem ativas para o banner.", { code: "LILY_LANDING_MEDIA_INVALID", field: "banner.desktopMediaId" });
  }
}

async function assertBannerAction(config: LandingPageConfig) {
  const action = config.banner.action;
  if (action.kind === "product") {
    const product = await lilyPrisma.lilyProduct.findFirst({ where: { id: action.targetId, status: "published", isAvailable: true, vipEarlyAccess: false, category: { status: "published" }, variants: { some: { status: "published", isAvailable: true } } }, select: { id: true } });
    if (!product) throw new ApiError(400, "Escolha um produto publicado e disponível para o banner.", { code: "LILY_LANDING_PRODUCT_INVALID", field: "banner.action.targetId" });
  }
  if (action.kind === "social") {
    const settings = await getLilyOperationalSettings();
    if (!parseSocialLinks(settings.socialLinksJson).some((link) => link.platform === action.targetId)) {
      throw new ApiError(400, "A rede escolhida não está configurada na loja.", { code: "LILY_LANDING_SOCIAL_INVALID", field: "banner.action.targetId" });
    }
  }
}

export async function lilyLandingPageRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/landing", async () => {
    const settings = await getLilyOperationalSettings();
    const config = readConfig(settings.landingPageJson);
    const ids = [...new Set([config.banner.desktopMediaId, config.banner.mobileMediaId].filter((id): id is string => Boolean(id)))];
    const assets = ids.length ? await lilyPrisma.lilyMediaAsset.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true, altText: true } }) : [];
    const media = new Map(assets.map((asset) => [asset.id, { id: asset.id, url: mediaUrl(asset.id), altText: asset.altText }]));
    const { desktopMediaId, mobileMediaId, ...publicBannerConfig } = config.banner;
    const productTarget = config.banner.action.kind === "product"
      ? await lilyPrisma.lilyProduct.findFirst({ where: { id: config.banner.action.targetId, status: "published", isAvailable: true, vipEarlyAccess: false, category: { status: "published" }, variants: { some: { status: "published", isAvailable: true } } }, select: { id: true, slug: true } })
      : null;
    return {
      ...config,
      banner: {
        ...publicBannerConfig,
        desktopImage: desktopMediaId ? media.get(desktopMediaId) ?? null : null,
        mobileImage: mobileMediaId ? media.get(mobileMediaId) ?? null : null,
        productTarget
      },
      address: settings.publicAddressText ?? null
    };
  });

  app.get("/api/v1/lily/admin/landing", async (request) => {
    await requireLilyStaff(request);
    const settings = await getLilyOperationalSettings();
    const media = await lilyPrisma.lilyMediaAsset.findMany({
      where: { status: "active", mime: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, originalName: true, mime: true, altText: true }
    });
    return { config: readConfig(settings.landingPageJson), media: media.map((asset) => ({ ...asset, url: mediaUrl(asset.id) })) };
  });

  app.get("/api/v1/lily/admin/landing/options", async (request) => {
    await requireLilyStaff(request);
    const { kind } = z.object({ kind: z.enum(["product", "showcase", "social", "page"]) }).parse(request.query);
    if (kind === "page") return { options: pageOptions };
    const settings = await getLilyOperationalSettings();
    if (kind === "social") return { options: parseSocialLinks(settings.socialLinksJson).map(({ platform, label, url }) => ({ id: platform, label, url })) };
    const products = await lilyPrisma.lilyProduct.findMany({
      where: { status: "published", category: { status: "published" } },
      include: { variants: { where: { status: "published", isAvailable: true }, select: { id: true } } },
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
      take: 100
    });
    const options = products.map((product) => ({ id: product.id, label: product.displayName, slug: product.slug, available: product.isAvailable && product.variants.length > 0 && !product.vipEarlyAccess }));
    return { options: kind === "product" ? options.filter((product) => product.available) : options };
  });

  app.put("/api/v1/lily/admin/landing", async (request) => {
    const context = await requireLilyStaff(request, true);
    const config = landingPageSchema.parse(request.body);
    await assertImageAssets(config);
    await assertBannerAction(config);
    const configuredProducts = [...new Set(config.showcase.productIds)];
    if (configuredProducts.length) {
      const valid = await lilyPrisma.lilyProduct.findMany({
        where: { id: { in: configuredProducts }, status: "published", isAvailable: true, vipEarlyAccess: false, category: { status: "published" } },
        include: { variants: { where: { status: "published", isAvailable: true }, select: { id: true } } }
      });
      if (valid.length !== configuredProducts.length || valid.some((product) => product.variants.length === 0)) {
        throw new ApiError(400, "A seleção do carrossel contém produtos indisponíveis ou não publicados.", { code: "LILY_LANDING_PRODUCTS_INVALID", field: "showcase.productIds" });
      }
    }
    const updated = await lilyPrisma.lilyOperationalSettings.update({ where: { id: SETTINGS_ID }, data: { landingPageJson: JSON.stringify(config) } });
    await auditLilyAdmin(context.user.id, "update", "landing-page", SETTINGS_ID, { config });
    return { config: readConfig(updated.landingPageJson) };
  });
}
