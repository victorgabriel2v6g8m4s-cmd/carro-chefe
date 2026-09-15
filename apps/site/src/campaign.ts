export type Attribution = {
  ccQr: string | null;
  ccCampaign: string | null;
  ccVariant: string | null;
  firstSeenAt: string;
};

function sanitize(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 120 && /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

export function readAttribution(search: string, now = new Date().toISOString()): Attribution {
  const params = new URLSearchParams(search);
  return {
    ccQr: sanitize(params.get("cc_qr")),
    ccCampaign: sanitize(params.get("cc_campaign")),
    ccVariant: sanitize(params.get("cc_variant")),
    firstSeenAt: now
  };
}

let current: { search: string; attribution: Attribution } | undefined;

// A URL desta entrada decide a campanha. Um acesso anterior não transforma visitas diretas em VIP.
export function getAttribution(): Attribution {
  const search = window.location.search;
  if (!current || current.search !== search) current = { search, attribution: readAttribution(search) };
  return current.attribution;
}

export function isBannerVipCampaign(attribution: Attribution): boolean {
  return attribution.ccQr === "QR-001" && attribution.ccCampaign === "banner";
}
