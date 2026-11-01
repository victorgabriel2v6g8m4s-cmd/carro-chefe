import type { LilyLandingPageConfig, LilyLandingPageId, LilyLandingSocialId } from "@carro-chefe/contracts";
import type { CatalogProduct, LilyPublicConfig } from "../../api";

const pagePaths: Record<LilyLandingPageId, string> = {
  cardapio: "/cardapio", ranking: "/ranking", reels: "/reels", dashboard: "/dashboard", niveis: "/niveis", pesquisas: "/pesquisas"
};

export function landingCropImageStyle(crop: LilyLandingPageConfig["banner"]["desktopCrop"]) {
  const panX = (50 - crop.x) * (crop.zoom - 1);
  const panY = (50 - crop.y) * (crop.zoom - 1);
  return {
    objectPosition: `${crop.x}% ${crop.y}%`,
    transform: `translate(${panX}%, ${panY}%) scale(${crop.zoom})`
  };
}

export function landingActionTarget(action: { kind: string; targetId?: string }, config: LilyPublicConfig | null, products: CatalogProduct[], linkedProductSlug?: string) {
  if (action.kind === "page" && action.targetId && action.targetId in pagePaths) return { href: pagePaths[action.targetId as LilyLandingPageId], external: false };
  if (action.kind === "social" && action.targetId) {
    const platform = action.targetId as LilyLandingSocialId;
    const link = config?.social.links.find((item) => item.platform === platform);
    if (link) return { href: link.url, external: true };
  }
  if (action.kind === "product" && action.targetId) {
    const productSlug = linkedProductSlug ?? products.find((item) => item.id === action.targetId && !item.vipLocked)?.slug;
    if (productSlug) return { href: `/cardapio?produto=${encodeURIComponent(productSlug)}`, external: false };
  }
  return null;
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function productStartingPrice(product: CatalogProduct) {
  const prices = [...product.variants.map((variant) => variant.priceCents), ...product.mixTiers.map((tier) => tier.priceCents)].filter((value) => value > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function productBadges(product: CatalogProduct) {
  const badges: string[] = [];
  if (product.vipEarlyAccess) badges.push("VIP");
  if (product.featured) badges.push("Destaque");
  if (product.weeklyHighlight) badges.push("Escolha da semana");
  if (product.tags.some((tag) => tag.toLowerCase() === "mais-pedido" || tag.toLowerCase() === "mais pedido")) badges.push("Mais pedido");
  return badges;
}
