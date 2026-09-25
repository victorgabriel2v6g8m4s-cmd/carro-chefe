export type AuthPayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    role: string;
    avatarUrl: string | null;
    rankingOptIn: boolean;
  };
  csrfToken: string;
  sessionExpiresAt: string;
  consents: Record<string, {
    granted: boolean;
    version: string;
    recordedAt: string;
    revokedAt: string | null;
  }>;
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
};

export type CatalogAddon = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  individualLimit: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  displayName: string;
  descriptiveName: string | null;
  description: string | null;
  tags: string[];
  configurationType: "fixed" | "lilymix";
  status: string;
  isAvailable: boolean;
  isPurchasable: boolean;
  soldOut: boolean;
  featured: boolean;
  weeklyHighlight: boolean;
  allowPlaceholder: boolean;
  sortOrder: number;
  category: {
    id: string;
    slug: string;
    name: string;
    parent: { id: string; slug: string; name: string } | null;
  };
  cover: { id: string; url: string; altText: string } | null;
  gallery: Array<{ id: string; url: string; altText: string }>;
  variants: CatalogVariant[];
  flavors: CatalogFlavor[];
  addons: CatalogAddon[];
  mixTiers: Array<{ id: string; flavorCount: number; sizeMl: number; priceCents: number }>;
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
      product: { id: string; slug: string; name: string; cover: { id: string; url: string; altText: string } | null } | null;
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
    variant: { id: string; name: string };
    sizeMl: number;
    flavors: Array<{ id: string; name: string }>;
    addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
    basePriceCents: number;
    addonPriceCents: number;
    totalPriceCents: number;
  }>(response);
}

export async function getLilyAdminCatalog() {
  const response = await fetch("/api/v1/lily/admin/catalog", { credentials: "same-origin" });
  return parseResponse<Record<string, any>>(response);
}

export async function lilyAdminJson<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  csrfToken: string,
  body: unknown
) {
  const response = await fetch(`/api/v1/lily/admin/${path.replace(/^\//, "")}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
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
  return parseResponse<{ id: string; url: string; originalName: string; altText: string }>(response);
}


export type ComboConfigurationQuote = {
  kind: "combo";
  mode: "preset" | "builder";
  configurationHash: string;
  combo: { id: string; slug: string; name: string; description: string | null };
  selections: Array<{
    configurationHash: string;
    product: { id: string; slug: string; name: string };
    variant: { id: string; name: string };
    sizeMl: number;
    flavors: Array<{ id: string; name: string }>;
    addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
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

export type LilyProfilePayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    avatarUrl: string | null;
    rankingOptIn: boolean;
  };
  loyalty: {
    points: number;
    orderCount: number;
    campaignCount: number;
    rank: number | null;
  };
};

export type LilyRankingRow = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  orderCount: number;
  campaignCount: number;
};

export async function getLilyProfile() {
  const response = await fetch("/api/v1/lily/customer/profile", { credentials: "same-origin" });
  return parseResponse<LilyProfilePayload>(response);
}

export async function updateLilyProfile(
  input: { displayName?: string | null; rankingOptIn?: boolean },
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
