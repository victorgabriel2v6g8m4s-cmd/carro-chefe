import crypto from "node:crypto";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";

const idSchema = z.string().trim().min(1).max(120);
const sizeSchema = z.number().int().min(100).max(5000);

export const lilyConfigurationSchema = z.object({
  productId: idSchema,
  sizeMl: sizeSchema,
  flavorIds: z.array(idSchema).max(3).default([]),
  addons: z.array(z.object({
    addonId: idSchema,
    quantity: z.number().int().min(1).max(2)
  }).strict()).max(3).default([])
}).strict();

export type LilyConfigurationInput = z.infer<typeof lilyConfigurationSchema>;

export function isActiveWindow(startsAt: Date | null, endsAt: Date | null, now = new Date()) {
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

const pricingInclude = {
  variants: { orderBy: [{ sortOrder: "asc" as const }, { sizeMl: "asc" as const }] },
  flavorLinks: { include: { flavor: true } },
  addonLinks: { include: { addon: { include: { flavor: true } } } },
  mixTiers: { orderBy: [{ sizeMl: "asc" as const }, { flavorCount: "asc" as const }] },
  offers: true
};

async function pairCompatible(flavorAId: string, flavorBId: string) {
  if (flavorAId === flavorBId) return true;
  const row = await lilyPrisma.lilyFlavorCompatibility.findUnique({
    where: { flavorAId_flavorBId: { flavorAId, flavorBId } }
  });
  return row?.isCompatible === true;
}

async function validateFlavorSet(flavorIds: string[]) {
  if (new Set(flavorIds).size !== flavorIds.length) {
    throw new ApiError(400, "Não repita o mesmo sabor na combinação.", { code: "LILY_DUPLICATE_FLAVOR" });
  }
  for (let i = 0; i < flavorIds.length; i += 1) {
    for (let j = i + 1; j < flavorIds.length; j += 1) {
      if (!await pairCompatible(flavorIds[i]!, flavorIds[j]!)) {
        throw new ApiError(400, "Esta combinação de sabores não está liberada.", {
          code: "LILY_INCOMPATIBLE_FLAVORS",
          flavors: [flavorIds[i], flavorIds[j]]
        });
      }
    }
  }
}

export async function quoteLilyConfiguration(input: LilyConfigurationInput) {
  const product = await lilyPrisma.lilyProduct.findUnique({ where: { id: input.productId }, include: pricingInclude });
  if (!product || product.status !== "published") throw new ApiError(404, "Produto não encontrado.", { code: "LILY_PRODUCT_NOT_FOUND" });
  if (!product.isAvailable) throw new ApiError(409, "Produto esgotado.", { code: "LILY_PRODUCT_SOLD_OUT" });

  const variant = product.variants.find((item) => item.sizeMl === input.sizeMl && item.status === "published");
  if (!variant || !variant.isAvailable) throw new ApiError(409, "Tamanho indisponível.", { code: "LILY_VARIANT_UNAVAILABLE" });

  let basePriceCents = variant.priceCents;
  const selectedFlavors = product.flavorLinks.map((link) => link.flavor)
    .filter((flavor) => input.flavorIds.includes(flavor.id) && flavor.status === "published");

  if (product.configurationType === "lilymix") {
    if (input.flavorIds.length < 1 || input.flavorIds.length > 3 || selectedFlavors.length !== input.flavorIds.length) {
      throw new ApiError(400, "Escolha de 1 a 3 sabores disponíveis.", { code: "LILY_FLAVOR_COUNT" });
    }
    await validateFlavorSet(input.flavorIds);
    const tier = product.mixTiers.find((item) =>
      item.status === "published" && item.sizeMl === input.sizeMl && item.flavorCount === input.flavorIds.length
    );
    if (!tier) throw new ApiError(400, "Preço não configurado para esta combinação.", { code: "LILY_TIER_MISSING" });
    basePriceCents = tier.priceCents + selectedFlavors.reduce((sum, flavor) =>
      sum + (input.sizeMl === 300 ? flavor.priceModifier300 : flavor.priceModifier500), 0);
  } else if (input.flavorIds.length > 0) {
    if (new Set(input.flavorIds).size !== input.flavorIds.length) {
      throw new ApiError(400, "Não repita o mesmo sabor na combinação.", { code: "LILY_DUPLICATE_FLAVOR" });
    }
    const fixedIds = new Set(product.flavorLinks.map((link) => link.flavorId));
    if (input.flavorIds.some((id) => !fixedIds.has(id))) {
      throw new ApiError(400, "Sabores do produto fixo não podem ser trocados.", { code: "LILY_FIXED_FLAVOR" });
    }
  }

  const applicableOffer = product.offers.find((offer) =>
    offer.status === "published"
    && isActiveWindow(offer.startsAt, offer.endsAt)
    && (!offer.variantId || offer.variantId === variant.id)
    && offer.regularPriceCents === basePriceCents
  );
  if (applicableOffer) basePriceCents = applicableOffer.offerPriceCents;

  const uniqueAddonIds = new Set(input.addons.map((item) => item.addonId));
  if (uniqueAddonIds.size !== input.addons.length || uniqueAddonIds.size > 3) {
    throw new ApiError(400, "Use no máximo 3 tipos diferentes de adicional.", { code: "LILY_ADDON_TYPES_LIMIT" });
  }
  if (input.addons.reduce((sum, item) => sum + item.quantity, 0) > 4) {
    throw new ApiError(400, "Limite de 4 porções adicionais por item.", { code: "LILY_ADDON_TOTAL_LIMIT" });
  }

  let addonPriceCents = 0;
  const addonDetails: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }> = [];
  for (const requested of input.addons) {
    const link = product.addonLinks.find((item) =>
      item.addonId === requested.addonId && item.allowed && item.addon.status === "published"
    );
    if (!link) throw new ApiError(400, "Adicional não permitido para este produto.", { code: "LILY_ADDON_NOT_ALLOWED" });
    const limit = link.individualLimit ?? link.addon.individualLimit;
    if (requested.quantity > limit) throw new ApiError(400, "Quantidade deste adicional excede o limite.", { code: "LILY_ADDON_INDIVIDUAL_LIMIT" });
    if (product.configurationType === "lilymix" && link.addon.flavorId) {
      for (const flavorId of input.flavorIds) {
        if (!await pairCompatible(flavorId, link.addon.flavorId)) {
          throw new ApiError(400, "Adicional incompatível com um dos sabores escolhidos.", { code: "LILY_ADDON_INCOMPATIBLE" });
        }
      }
    }
    const unitPriceCents = link.priceOverride ?? link.addon.priceCents;
    addonPriceCents += unitPriceCents * requested.quantity;
    addonDetails.push({ addonId: link.addonId, name: link.addon.name, quantity: requested.quantity, unitPriceCents });
  }

  const canonical = JSON.stringify({
    productId: product.id,
    sizeMl: input.sizeMl,
    flavorIds: [...input.flavorIds].sort(),
    addons: [...input.addons].sort((a, b) => a.addonId.localeCompare(b.addonId))
  });
  const configurationHash = crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 24);
  const totalPriceCents = basePriceCents + addonPriceCents;
  return {
    configurationHash,
    product: { id: product.id, slug: product.slug, name: product.displayName },
    variant: { id: variant.id, name: variant.name },
    sizeMl: input.sizeMl,
    flavors: selectedFlavors.map((flavor) => ({ id: flavor.id, name: flavor.name })),
    addons: addonDetails,
    basePriceCents,
    addonPriceCents,
    totalPriceCents
  };
}
