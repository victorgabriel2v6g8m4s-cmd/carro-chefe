export const COOKLILY_ATTRIBUTION_PARAMS = {
  qr: { canonical: "la_qr", legacy: "cc_qr" },
  campaign: { canonical: "la_campaign", legacy: "cc_campaign" },
  variant: { canonical: "la_variant", legacy: "cc_variant" }
} as const;

export type CanonicalLilyAttribution = {
  laQr: string | null;
  laCampaign: string | null;
  laVariant: string | null;
};

const MAX_ATTRIBUTION_LENGTH = 120;

function sanitize(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_ATTRIBUTION_LENGTH);
  return normalized || null;
}

function valueOf(source: Record<string, unknown>, canonical: string, legacy: string) {
  return sanitize(source[canonical]) ?? sanitize(source[legacy]);
}

export function normalizeLilyAttribution(source: Record<string, unknown>): CanonicalLilyAttribution {
  return {
    laQr: valueOf(source, "la_qr", "cc_qr"),
    laCampaign: valueOf(source, "la_campaign", "cc_campaign"),
    laVariant: valueOf(source, "la_variant", "cc_variant")
  };
}
