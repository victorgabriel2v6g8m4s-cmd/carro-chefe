export type CookLilyAttribution = {
  laQr: string | null;
  laCampaign: string | null;
  laVariant: string | null;
};

const MAX_ATTRIBUTION_LENGTH = 120;

function sanitize(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_ATTRIBUTION_LENGTH);
  return normalized || null;
}

function canonical(params: URLSearchParams, preferred: string, legacy: string) {
  return sanitize(params.get(preferred)) ?? sanitize(params.get(legacy));
}

export function readCookLilyAttribution(search: string): CookLilyAttribution {
  const params = new URLSearchParams(search);
  return {
    laQr: canonical(params, "la_qr", "cc_qr"),
    laCampaign: canonical(params, "la_campaign", "cc_campaign"),
    laVariant: canonical(params, "la_variant", "cc_variant")
  };
}

export function hasCookLilyAttribution(value: CookLilyAttribution) {
  return Boolean(value.laQr || value.laCampaign || value.laVariant);
}


const STORAGE_KEY = "cooklily_attribution_v1";

export function storeCookLilyAttribution(value: CookLilyAttribution) {
  if (!hasCookLilyAttribution(value)) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function readStoredCookLilyAttribution(): CookLilyAttribution {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<CookLilyAttribution>;
    return {
      laQr: typeof parsed.laQr === "string" ? sanitize(parsed.laQr) : null,
      laCampaign: typeof parsed.laCampaign === "string" ? sanitize(parsed.laCampaign) : null,
      laVariant: typeof parsed.laVariant === "string" ? sanitize(parsed.laVariant) : null
    };
  } catch {
    return { laQr: null, laCampaign: null, laVariant: null };
  }
}

export function attributionForApi(value: CookLilyAttribution) {
  return {
    ...(value.laQr ? { la_qr: value.laQr } : {}),
    ...(value.laCampaign ? { la_campaign: value.laCampaign } : {}),
    ...(value.laVariant ? { la_variant: value.laVariant } : {})
  };
}
