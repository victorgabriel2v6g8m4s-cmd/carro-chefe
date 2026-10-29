import type { LilyBenefit } from "../../api";

export type LoyaltyLevel = {
  id: string;
  name: string;
  sortOrder: number;
  requiredPoints: number;
  lilyCoins: number;
  benefits: LilyBenefit[];
  iconMediaId: string | null;
  iconUrl: string | null;
  active: boolean;
};

export type LoyaltyProductOption = { id: string; name: string; sizeMl?: number };
export type LoyaltyCatalogProduct = {
  id: string;
  displayName: string;
  slug: string;
  categoryId: string;
  category: { name: string };
  minimumAddonUnits: number;
  maximumAddonUnits: number;
  variants: LoyaltyProductOption[];
  flavorLinks: Array<{ flavor: LoyaltyProductOption }>;
  addonLinks: Array<{ addon: LoyaltyProductOption }>;
};

export type LoyaltyCatalogCombo = {
  id: string;
  name: string;
  description: string | null;
  items: Array<{ id: string; quantity: number; sizeMl: number | null; flavorCount: number | null; product: LoyaltyCatalogProduct }>;
};

export type LoyaltyBenefitCatalog = {
  categories: Array<{ id: string; name: string; parentId: string | null }>;
  products: LoyaltyCatalogProduct[];
  coupons: Array<{ id: string; title: string; code: string; type: string; value: number }>;
  discounts: Array<{ id: string; title: string; code: string; type: string; value: number }>;
  offers: Array<{ id: string; name: string; productId: string | null; variantId: string | null; regularPriceCents: number; offerPriceCents: number; startsAt: string | null; endsAt: string | null }>;
  combos: LoyaltyCatalogCombo[];
  userClasses: Array<{ id: string; name: string; description: string }>;
};

export type LoyaltyBranding = { coinName: string; coinIconMediaId: string | null; coinIconUrl: string | null };

export type LoyaltyAdminPayload = {
  levels: LoyaltyLevel[];
  roundingMode: "floor" | "ceil" | "nearest";
  configVersion: number;
  rewards: Array<{ id: string; title: string; description: string | null; type: string; lilyCoinCost: number; couponId: string | null; productId: string | null; active: boolean; maxRedemptions: number | null }>;
  missions: Array<{ id: string; title: string; status: string; points: number; lilyCoins: number }>;
  coupons: Array<{ id: string; title: string; code: string }>;
  products: Array<{ id: string; displayName: string; slug: string }>;
  branding: LoyaltyBranding;
  benefitCatalog: LoyaltyBenefitCatalog;
};
