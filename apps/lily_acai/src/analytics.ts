import {
  attributionForApi,
  hasCookLilyAttribution,
  readCookLilyAttribution,
  readStoredCookLilyAttribution,
  type CookLilyAttribution
} from "./tracking";

export type LilyAnalyticsConsent = "granted" | "denied" | "unknown";

export type LilyAnalyticsEvent =
  | "page_view"
  | "catalog_view"
  | "product_view"
  | "product_configured"
  | "combo_view"
  | "combo_configured"
  | "add_to_cart"
  | "cart_view"
  | "checkout_start"
  | "order_created"
  | "payment_start"
  | "payment_confirmed"
  | "instagram_click"
  | "whatsapp_click"
  | "privacy_open"
  | "lead_submit"
  | "lead_success"
  | "lead_error"
  | "analytics_consent_granted";

export type LilyAnalyticsSurface =
  | "landing"
  | "catalog"
  | "product"
  | "combo"
  | "cart"
  | "checkout"
  | "payment"
  | "account"
  | "ranking"
  | "privacy";

export type LilyAnalyticsMetadata = {
  surface?: LilyAnalyticsSurface;
  productSlug?: string;
  comboSlug?: string;
  variantSizeMl?: number;
  addonCount?: number;
  itemCount?: number;
  fulfillmentType?: "pickup" | "delivery";
  paymentMethod?: "pix" | "manual_pix" | "credit_card";
};

type QueuedEvent = {
  eventId: string;
  occurredAt: string;
  event: LilyAnalyticsEvent;
  path: string;
  attribution: CookLilyAttribution;
  metadata: LilyAnalyticsMetadata;
};

const CONSENT_VERSION = "cooklily-analytics-v1";
const CONSENT_KEY = "cooklily.analytics-consent.v1";
const SESSION_KEY = "cooklily.analytics-session.v1";
const CONSENT_EVENT = "cooklily:analytics-consent-change";
const OPEN_EVENT = "cooklily:analytics-open";
const pendingEvents: QueuedEvent[] = [];
const memoryStorage = new Map<string, string>();

function readStorage(kind: "local" | "session", key: string) {
  try {
    return window[kind === "local" ? "localStorage" : "sessionStorage"].getItem(key)
      ?? memoryStorage.get(key)
      ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function writeStorage(kind: "local" | "session", key: string, value: string) {
  memoryStorage.set(key, value);
  try {
    window[kind === "local" ? "localStorage" : "sessionStorage"].setItem(key, value);
  } catch {
    // Navegação privada continua funcional com fallback em memória.
  }
}

function currentAttribution() {
  const current = readCookLilyAttribution(window.location.search);
  return hasCookLilyAttribution(current) ? current : readStoredCookLilyAttribution();
}

function currentPath() {
  const path = window.location.pathname || "/lilyacai/";
  return path.slice(0, 240);
}

function getSessionId() {
  const stored = readStorage("session", SESSION_KEY);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
    return stored;
  }
  const id = crypto.randomUUID();
  writeStorage("session", SESSION_KEY, id);
  return id;
}

export function getLilyAnalyticsConsent(): LilyAnalyticsConsent {
  const stored = readStorage("local", CONSENT_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

async function sendEvent(item: QueuedEvent) {
  try {
    await fetch("/api/v1/lily/public/analytics/events", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: item.eventId,
        sessionId: getSessionId(),
        event: item.event,
        consentVersion: CONSENT_VERSION,
        occurredAt: item.occurredAt,
        path: item.path,
        attribution: attributionForApi(item.attribution),
        metadata: item.metadata
      })
    });
  } catch {
    // Analytics nunca interrompe navegação, carrinho, checkout ou pagamento.
  }
}

function eventEnvelope(
  event: LilyAnalyticsEvent,
  metadata: LilyAnalyticsMetadata,
  path = currentPath(),
  attribution = currentAttribution()
): QueuedEvent {
  return {
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    event,
    path,
    attribution,
    metadata
  };
}

export function trackLilyAnalytics(event: LilyAnalyticsEvent, metadata: LilyAnalyticsMetadata = {}) {
  const consent = getLilyAnalyticsConsent();
  if (consent === "denied") return;

  const item = eventEnvelope(event, metadata);
  if (consent === "unknown") {
    if (pendingEvents.length < 100) pendingEvents.push(item);
    return;
  }
  void sendEvent(item);
}

export function grantLilyAnalytics() {
  writeStorage("local", CONSENT_KEY, "granted");
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "granted" }));

  const queued = pendingEvents.splice(0);
  for (const item of queued) void sendEvent(item);
  void sendEvent(eventEnvelope("analytics_consent_granted", { surface: "privacy" }));
}

export function denyLilyAnalytics() {
  writeStorage("local", CONSENT_KEY, "denied");
  pendingEvents.splice(0);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "denied" }));
}

export function openLilyAnalyticsPreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export const lilyAnalyticsEvents = {
  consent: CONSENT_EVENT,
  open: OPEN_EVENT
} as const;
