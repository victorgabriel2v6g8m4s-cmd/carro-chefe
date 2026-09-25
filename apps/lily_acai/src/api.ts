export type AuthPayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    role: string;
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
  projectedMarginBps: number | null;
};

export type CatalogFlavor = {
  id: string;
  slug: string;
  name: string;
  premium: boolean;
  portion300?: number;
  portion500?: number;
  priceModifier300?: number;
  priceModifier500?: number;
};

export type CatalogAddon = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  portion300: number;
  portion500: number;
  individualLimit: number;
  flavorId: string | null;
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
  preparationLeadMinutes: number | null;
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
    rules: Record<string, unknown>;
    regularPriceCents: number;
    offerPriceCents: number;
    savingsCents: number;
    featured: boolean;
  }>;
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

export async function getLilyConfig() {
  const response = await fetch("/api/v1/lily/public/config", { credentials: "same-origin" });
  return parseResponse<{
    termsVersion: string;
    privacyPolicyVersion: string;
    consentVersions: Record<string, string>;
    brand: { name: string; wordmark: string };
    tracking: unknown;
  }>(response);
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
