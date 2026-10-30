export type AuthPayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    role: string;
    avatarUrl: string | null;
    rankingOptIn: boolean;
    staffPasswordUpgradeRequired: boolean;
    mfaEnabled: boolean;
  };
  csrfToken: string;
  sessionExpiresAt: string;
  consents: Record<string, {
    granted: boolean;
    version: string;
    recordedAt: string;
    revokedAt: string | null;
  }>;
  mfa?: {
    required: boolean;
    enabled: boolean;
    verified: boolean;
    setupRequired: boolean;
  };
};

export type LilyAllergenDescriptor = {
  code: string;
  label: string;
};

export type LilyAllergenComponentInfo = {
  reviewStatus: string;
  contains: LilyAllergenDescriptor[];
  mayContain: LilyAllergenDescriptor[];
};

export type LilyAllergenSummary = {
  complete: boolean;
  contains: LilyAllergenDescriptor[];
  mayContain: LilyAllergenDescriptor[];
  unreviewed: string[];
};

export type CatalogVariant = {
  id: string;
  sizeMl: number;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isAvailable: boolean;
};

export type CatalogFlavor = {
  id: string;
  slug: string;
  name: string;
  premium: boolean;
  allergens: LilyAllergenComponentInfo;
};

export type CatalogAddon = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  individualLimit: number;
  allergens: LilyAllergenComponentInfo;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  displayName: string;
  descriptiveName: string | null;
  description: string | null;
  tags: string[];
  allergens: LilyAllergenComponentInfo;
  configurationType: "fixed" | "lilymix";
  minimumAddonUnits: number;
  maximumAddonUnits: number;
  status: string;
  isAvailable: boolean;
  isPurchasable: boolean;
  soldOut: boolean;
  featured: boolean;
  weeklyHighlight: boolean;
  allowPlaceholder: boolean;
  vipEarlyAccess: boolean;
  vipTeaserDescription: string | null;
  vipLocked?: boolean;
  sortOrder: number;
  category: {
    id: string;
    slug: string;
    name: string;
    parent: { id: string; slug: string; name: string } | null;
  };
  cover: { id: string; url: string; altText: string; mime: string } | null;
  gallery: Array<{ id: string; url: string; altText: string; mime: string }>;
  variants: CatalogVariant[];
  flavors: CatalogFlavor[];
  addons: CatalogAddon[];
  mixTiers: Array<{ id: string; flavorCount: number; sizeMl: number; priceCents: number; compareAtPriceCents: number | null }>;
  offers: Array<{
    id: string;
    name: string;
    regularPriceCents: number;
    offerPriceCents: number;
    savingsCents: number;
    startsAt: string | null;
    endsAt: string | null;
  }>;
};

export type CatalogPayload = {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    isComingSoon: boolean;
    children: Array<{ id: string; slug: string; name: string; description: string | null; isComingSoon: boolean }>;
  }>;
  flavors: CatalogFlavor[];
  combos: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    mode: "preset" | "builder";
    rules: Record<string, unknown>;
    regularPriceCents: number;
    offerPriceCents: number;
    savingsCents: number;
    featured: boolean;
    cover: { id: string; url: string; altText: string } | null;
    presetSelections: Array<{
      productId: string;
      sizeMl: number;
      flavorIds: string[];
      addons: Array<{ addonId: string; quantity: number }>;
      product: {
        id: string; slug: string; name: string; cover: { id: string; url: string; altText: string } | null;
        minimumAddonUnits: number; maximumAddonUnits: number; addons: CatalogAddon[];
      } | null;
      flavors: Array<{ id: string; slug: string; name: string; premium: boolean }>;
    }>;
  }>;
  weeklyProduct: CatalogProduct | null;
  featuredProduct: CatalogProduct | null;
  products: CatalogProduct[];
  total: number;
  offset: number;
  nextOffset: number | null;
};

export async function parseResponse<T>(response: Response): Promise<T> {
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : "Não foi possível concluir a solicitação.";
    throw new Error(message);
  }
  return body as T;
}

export type LilyPublicConfig = {
  termsVersion: string;
  privacyPolicyVersion: string;
  consentVersions: Record<string, string>;
  brand: { name: string; wordmark: string };
  social: {
    links: Array<{ platform: "instagram" | "facebook" | "whatsapp" | "tiktok" | "google"; label: string; identifier: string; url: string }>;
    instagramHandle: string;
    instagramUrl: string | null;
    whatsappPhone: string;
    whatsappUrl: string | null;
  };
  store: { address: string | null };
  loyalty: {
    orderCentsPerPoint: number;
    campaignBonusPoints: number;
    couponBonusPoints: number;
  };
  tracking: unknown;
};

export async function getLilyConfig() {
  const response = await fetch("/api/v1/lily/public/config", { credentials: "same-origin" });
  return parseResponse<LilyPublicConfig>(response);
}

export async function registerLily(input: {
  phone: string;
  password: string;
  displayName?: string;
  referralCode?: string;
  termsAccepted: true;
  termsVersion: string;
  privacyPolicyVersion: string;
  consents: {
    lilyMarketing: boolean;
    shareWithCarroChefe: boolean;
    analyticsOptional: boolean;
  };
}) {
  const response = await fetch("/api/v1/lily/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AuthPayload>(response);
}

export async function loginLily(input: { phone: string; password: string }) {
  const response = await fetch("/api/v1/lily/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AuthPayload>(response);
}

export async function getLilySession() {
  const response = await fetch("/api/v1/lily/auth/me", {
    credentials: "same-origin"
  });
  return parseResponse<AuthPayload>(response);
}

export async function getLilyAuthStatus() {
  const response = await fetch("/api/v1/lily/auth/status", {
    credentials: "same-origin"
  });
  return parseResponse<{ user: AuthPayload["user"] | null }>(response);
}

export async function logoutLily(csrfToken: string) {
  const response = await fetch("/api/v1/lily/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrfToken }
  });
  if (response.status === 204) return;
  await parseResponse<unknown>(response);
}

export async function submitCookLilyLead(input: {
  phone: string;
  marketingConsent: true;
  consentVersion: string;
  privacyPolicyVersion: string;
  attribution?: Record<string, string>;
  website?: string;
}) {
  const response = await fetch("/api/v1/lily/public/leads", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<{ accepted: true }>(response);
}

export async function getLilyCatalog(params: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== false) query.set(key, String(value));
  }
  const response = await fetch(`/api/v1/lily/public/catalog?${query.toString()}`, {
    credentials: "same-origin"
  });
  return parseResponse<CatalogPayload>(response);
}

export async function getLilyProductBySlug(slug: string) {
  const response = await fetch(`/api/v1/lily/public/products/${encodeURIComponent(slug)}`, {
    credentials: "same-origin"
  });
  return parseResponse<CatalogProduct>(response);
}

export async function configureLilyItem(input: {
  productId: string;
  sizeMl: number;
  flavorIds?: string[];
  addons?: Array<{ addonId: string; quantity: number }>;
}) {
  const response = await fetch("/api/v1/lily/public/configure-item", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: input.productId,
      sizeMl: input.sizeMl,
      flavorIds: input.flavorIds ?? [],
      addons: input.addons ?? []
    })
  });
  return parseResponse<{
    configurationHash: string;
    product: { id: string; slug: string; name: string };
    variant: { id: string; name: string; compareAtPriceCents: number | null };
    sizeMl: number;
    flavors: Array<{ id: string; name: string }>;
    addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
    allergens: LilyAllergenSummary;
    basePriceCents: number;
    compareAtPriceCents: number | null;
    addonPriceCents: number;
    totalPriceCents: number;
  }>(response);
}

export async function getLilyAdminCatalog() {
  const response = await fetch("/api/v1/lily/admin/catalog", { credentials: "same-origin" });
  return parseResponse<Record<string, any>>(response);
}

export async function getLilyAdminCatalogIndex() {
  const response = await fetch("/api/v1/lily/admin/catalog/index", { credentials: "same-origin" });
  return parseResponse<Record<string, any>>(response);
}

export async function getLilyAdminProductEditor(productId: string) {
  const response = await fetch(`/api/v1/lily/admin/products/${encodeURIComponent(productId)}/editor`, { credentials: "same-origin" });
  return parseResponse<Record<string, any>>(response);
}

export async function lilyAdminJson<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  csrfToken: string,
  body: unknown,
  autosave = false
) {
  const response = await fetch(`/api/v1/lily/admin/${path.replace(/^\//, "")}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken,
      ...(autosave ? { "X-Lily-Autosave": "1" } : {})
    },
    body: JSON.stringify(body)
  });
  return parseResponse<T>(response);
}

export async function uploadLilyMedia(file: File, csrfToken: string) {
  const data = new FormData();
  data.append("file", file);
  const response = await fetch("/api/v1/lily/admin/media", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrfToken },
    body: data
  });
  return parseResponse<{ id: string; url: string; originalName: string; altText: string; mime: string; size: number }>(response);
}

export type LilyReelSocial = { productId: string; likeCount: number; liked: boolean; saved: boolean; comments: Array<{ id: string; name: string; body: string; createdAt: string }> };

export async function getLilyReelSocial(productId: string) {
  const response = await fetch(`/api/v1/lily/public/reels/${encodeURIComponent(productId)}/social`, { credentials: "same-origin" });
  return parseResponse<LilyReelSocial>(response);
}

export async function setLilyReelAction(productId: string, action: "like" | "save", enabled: boolean, csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/reels/action", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken }, body: JSON.stringify({ productId, action, enabled }) });
  return parseResponse<{ enabled: boolean }>(response);
}

export async function postLilyReelComment(productId: string, body: string, csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/reels/comments", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken }, body: JSON.stringify({ productId, body }) });
  return parseResponse<{ id: string; name: string; body: string; createdAt: string }>(response);
}

export async function getLilyProfileReels(kind: "liked" | "saved") {
  const response = await fetch(`/api/v1/lily/customer/reels/${kind}`, { credentials: "same-origin" });
  return parseResponse<{ reels: Array<{ id: string; slug: string; title: string; category: string; coverUrl: string | null; altText: string }> }>(response);
}


export type ComboConfigurationQuote = {
  kind: "combo";
  mode: "preset" | "builder";
  configurationHash: string;
  combo: { id: string; slug: string; name: string; description: string | null };
  allergens: LilyAllergenSummary;
  selections: Array<{
    configurationHash: string;
    product: { id: string; slug: string; name: string };
    variant: { id: string; name: string };
    sizeMl: number;
    flavors: Array<{ id: string; name: string }>;
    addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
    allergens: LilyAllergenSummary;
    basePriceCents: number;
    addonPriceCents: number;
    totalPriceCents: number;
  }>;
  regularPriceCents: number;
  basePriceCents: number;
  addonPriceCents: number;
  totalPriceCents: number;
  savingsCents: number;
};

export async function configureLilyCombo(payload: {
  comboId: string;
  selections: Array<{ productId: string; sizeMl: number; flavorIds: string[]; addons: Array<{ addonId: string; quantity: number }> }>;
}) {
  const response = await fetch("/api/v1/lily/public/configure-combo", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<ComboConfigurationQuote>(response);
}


export type ComboBuilderPayload = {
  combo: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    regularPriceCents: number;
    offerPriceCents: number;
    savingsCents: number;
  };
  quantity: number;
  sizeMl: number;
  options: CatalogProduct[];
};

export async function getLilyComboBuilder(comboId: string) {
  const response = await fetch(`/api/v1/lily/public/combos/${encodeURIComponent(comboId)}/builder`, {
    credentials: "same-origin"
  });
  return parseResponse<ComboBuilderPayload>(response);
}

export type LilyBenefit = {
  id: string;
  kind: "product" | "coupon" | "discount" | "offer" | "combo" | "user_class" | "note";
  entityId: string;
  label: string;
  categoryId: string | null;
  maxRedemptionsPerUser: number;
  selectionMode: "customer_choice" | "preset";
  configuration: {
    variantIds: string[];
    flavorIds: string[];
    addonIds: string[];
    comboItems?: Array<{ comboItemId: string; variantIds: string[]; flavorIds: string[]; addonIds: string[] }>;
  };
};

export type LilyProfilePayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    avatarUrl: string | null;
    rankingOptIn: boolean;
    whatsappUpdatesOptIn: boolean;
    whatsappOffersOptIn: boolean;
    vipStatus: "invited" | "active" | "canceled" | null;
  };
  loyalty: {
    points: number;
    orderCount: number;
    campaignCount: number;
    rank: number | null;
    rankScope: "public" | "internal";
    vipPointsThreshold: number;
    currentLevel: { id: string; name: string; requiredPoints: number; lilyCoins: number; iconUrl?: string | null; benefits: LilyBenefit[] } | null;
    nextLevel: { id: string; name: string; requiredPoints: number; lilyCoins: number; iconUrl?: string | null; benefits: LilyBenefit[] } | null;
    levelProgressPercent: number;
    lilyCoins: number;
    coinName: string;
    coinIconUrl: string | null;
  };
};

export type LilyLoyaltyPayload = {
  points: number;
  lilyCoins: number;
  coinName: string;
  coinIconUrl: string | null;
  currentLevel: { id: string; name: string; requiredPoints: number; lilyCoins: number; iconUrl: string | null; benefits: LilyBenefit[] } | null;
  nextLevel: { id: string; name: string; requiredPoints: number; lilyCoins: number; iconUrl: string | null; benefits: LilyBenefit[] } | null;
  unlockedLevels: Array<{ id: string; name: string; requiredPoints: number; iconUrl: string | null; benefits: Array<LilyBenefit & { redemptionsUsed: number; remainingRedemptions: number; canRedeem: boolean; redemptions: Array<{ id: string; redemptionCode: string; status: string; createdAt: string; fulfilledAt: string | null }> }> }>;
  levelProgressPercent: number;
  milestones: Array<{ id: string; name: string; requiredPoints: number; lilyCoins: number; iconUrl: string | null; reached: boolean }>;
  nextRewardTarget: { title: string; lilyCoinCost: number } | null;
  roundingMode: "floor" | "ceil" | "nearest";
  rewards: Array<{ id: string; title: string; description: string | null; type: string; lilyCoinCost: number; canRedeem: boolean }>;
};

export async function getLilyLoyalty() {
  return parseResponse<LilyLoyaltyPayload>(await fetch("/api/v1/lily/customer/loyalty", { credentials: "same-origin" }));
}

export async function redeemLilyReward(rewardId: string, csrfToken: string) {
  return parseResponse<{ redeemed: boolean; loyalty: LilyLoyaltyPayload }>(await fetch(`/api/v1/lily/customer/loyalty/rewards/${encodeURIComponent(rewardId)}/redeem`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken }, body: "{}"
  }));
}

export async function redeemLilyLevelBenefit(levelId: string, benefitId: string, csrfToken: string) {
  return parseResponse<{ redeemed: boolean; redemption: { id: string; levelName: string; benefitLabel: string; benefitKind: string; redemptionCode: string; status: string; createdAt: string }; loyalty: LilyLoyaltyPayload }>(await fetch(`/api/v1/lily/customer/loyalty/levels/${encodeURIComponent(levelId)}/benefits/${encodeURIComponent(benefitId)}/redeem`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken }, body: "{}"
  }));
}

export async function claimLilyMission(missionId: string, csrfToken: string) {
  return parseResponse<{ claimed: boolean; pointsAwarded: number; lilyCoinsAwarded: number; loyalty: LilyLoyaltyPayload }>(await fetch(`/api/v1/lily/customer/missions/${encodeURIComponent(missionId)}/claim`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken }, body: "{}"
  }));
}

export type LilyVipPayload = {
  membership: { status: string; source: string; consentVersion: string | null; consentedAt: string | null; enrolledAt: string | null } | null;
  points: number;
  pointsThreshold: number;
  eligibleByPoints: boolean;
  coupons: Array<{ code: string; title: string; type: string; value: number; endsAt: string | null; color: string }>;
};

export async function getLilyVip() {
  const response = await fetch("/api/v1/lily/customer/vip", { credentials: "same-origin" });
  return parseResponse<LilyVipPayload>(response);
}

export async function postLilyVipAction(action: "redeem" | "claim" | "consent" | "subscribe" | "cancel" | "launch-view", csrfToken: string, body: unknown = {}) {
  const response = await fetch(`/api/v1/lily/customer/vip/${action}`, {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(body)
  });
  return parseResponse<Record<string, unknown>>(response);
}

export type LilyRankingRow = {
  userId: string;
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  orderCount: number;
  campaignCount: number;
  missionCount: number;
  surveyCount: number;
  referralCount: number;
  activeDays: number;
  currentLevel: { id: string; name: string; requiredPoints: number; iconUrl: string | null } | null;
};

export type LilyPublicLevel = { id: string; name: string; requiredPoints: number; lilyCoins: number; benefits: Array<{ id: string; label: string; kind?: string }>; iconUrl: string | null };
export type LilyCustomerStats = {
  user: { displayName: string; avatarUrl: string | null };
  points: number;
  currentLevel: { id: string; name: string; requiredPoints: number; iconUrl: string | null } | null;
  totals: { missions: number; activity: number; surveys: number; orders: number; referrals: number };
  counts: { orders: number; surveys: number; referrals: number };
  activeDays: number;
  months: Array<{ key: string; label: string; missions: number; activity: number; surveys: number; orders: number; referrals: number }>;
};

export async function getLilyProfile() {
  const response = await fetch("/api/v1/lily/customer/profile", { credentials: "same-origin" });
  return parseResponse<LilyProfilePayload>(response);
}

export async function updateLilyProfile(
  input: { displayName?: string | null; rankingOptIn?: boolean; whatsappUpdatesOptIn?: boolean; whatsappOffersOptIn?: boolean },
  csrfToken: string
) {
  const response = await fetch("/api/v1/lily/customer/profile", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify(input)
  });
  return parseResponse<LilyProfilePayload>(response);
}

export async function uploadLilyProfileAvatar(file: File, csrfToken: string) {
  const data = new FormData();
  data.append("file", file);
  const response = await fetch("/api/v1/lily/customer/profile/avatar", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrfToken },
    body: data
  });
  return parseResponse<LilyProfilePayload>(response);
}

export async function getLilyRanking(limit = 20) {
  const response = await fetch(`/api/v1/lily/public/loyalty/ranking?limit=${encodeURIComponent(limit)}`, {
    credentials: "same-origin"
  });
  return parseResponse<{ ranking: LilyRankingRow[] }>(response);
}

export async function getLilyCustomerStats(userId?: string) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`/api/v1/lily/public/loyalty/stats${query}`, { credentials: "same-origin" });
  return parseResponse<LilyCustomerStats>(response);
}

export async function getLilyPublicLevels() {
  const response = await fetch("/api/v1/lily/public/loyalty/levels", { credentials: "same-origin" });
  return parseResponse<{ points: number; levels: LilyPublicLevel[] }>(response);
}


export async function changeLilyPassword(
  input: { currentPassword: string; newPassword: string },
  csrfToken: string
) {
  const response = await fetch("/api/v1/lily/customer/profile/password", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify(input)
  });
  return parseResponse<{ changed: true; otherSessionsRevoked: number }>(response);
}


export type LilyMfaStatus = {
  required: boolean;
  enabled: boolean;
  verified: boolean;
  setupRequired: boolean;
  recoveryCodesRemaining: number;
};

export async function getLilyMfaStatus() {
  const response = await fetch("/api/v1/lily/customer/security/mfa/status", {
    credentials: "same-origin"
  });
  return parseResponse<LilyMfaStatus>(response);
}

export async function startLilyMfaSetup(currentPassword: string, csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/security/mfa/setup", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify({ currentPassword })
  });
  return parseResponse<{ secret: string; otpauthUri: string }>(response);
}

export async function confirmLilyMfaSetup(code: string, csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/security/mfa/confirm", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify({ code })
  });
  return parseResponse<{ enabled: true; verified: true; recoveryCodes: string[] }>(response);
}

export async function verifyLilyMfa(code: string, csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/security/mfa/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify({ code })
  });
  return parseResponse<{ verified: true; method: "totp" | "recovery"; recoveryCodesRemaining: number }>(response);
}


export type LilySessionRow = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  mfaVerified: boolean;
};

export async function getLilySessions() {
  const response = await fetch("/api/v1/lily/customer/security/sessions", {
    credentials: "same-origin"
  });
  return parseResponse<{ sessions: LilySessionRow[] }>(response);
}

export async function revokeOtherLilySessions(csrfToken: string) {
  const response = await fetch("/api/v1/lily/customer/security/sessions/revoke-others", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrfToken }
  });
  return parseResponse<{ revoked: number }>(response);
}
