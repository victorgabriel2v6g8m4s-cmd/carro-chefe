import { getAttribution } from "./campaign";
import type { Attribution } from "./campaign";
export type AnalyticsConsent = "granted" | "denied" | "unknown";
const analyticsConsentKey = "carrochefe.analytics-consent.v1";
const sessionKey = "carrochefe.prelaunch.session.v1";
type VendorFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };
const analyticsWindow = window as Window & { dataLayer?: unknown[][]; gtag?: VendorFunction; clarity?: VendorFunction };
const memoryStorage = new Map<string, string>();
function readStorage(kind: "local" | "session", key: string) {
  try { return window[kind === "local" ? "localStorage" : "sessionStorage"].getItem(key) ?? memoryStorage.get(key); }
  catch { return memoryStorage.get(key); }
}
function writeStorage(kind: "local" | "session", key: string, value: string) {
  memoryStorage.set(key, value);
  try { window[kind === "local" ? "localStorage" : "sessionStorage"].setItem(key, value); } catch { /* Navegação privada continua funcional. */ }
}
type EventName =
  | "qr_scan"
  | "landing_view"
  | "signup_cta_click"
  | "form_start"
  | "signup_submit"
  | "signup_success"
  | "signup_duplicate"
  | "signup_error"
  | "reward_view"
  | "instagram_click"
  | "whatsapp_click"
  | "privacy_open"
  | "consent_analytics_granted";
type EventMetadata = {
  experiment?: string | null;
  ctaVariant?: string | null;
  formPosition?: string | null;
  hasProductMedia?: boolean | null;
  section?: "hero" | "reward" | "product_teaser" | "brand_story" | "social" | null;
};
type QueuedEvent = { event: EventName; metadata: EventMetadata; attribution: Attribution; path: string };

const pendingEvents: QueuedEvent[] = [];
let vendorsLoaded = false;

function getSessionId() {
  const stored = readStorage("session", sessionKey);
  if (stored && /^[A-Za-z0-9-]{16,96}$/.test(stored)) return stored;
  const id = crypto.randomUUID();
  writeStorage("session", sessionKey, id);
  return id;
}

function getAnalyticsConsent(): AnalyticsConsent {
  const stored = readStorage("local", analyticsConsentKey);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

function safeMetadata(metadata: EventMetadata = {}): EventMetadata {
  return {
    experiment: metadata.experiment ?? null,
    ctaVariant: metadata.ctaVariant ?? null,
    formPosition: metadata.formPosition ?? null,
    hasProductMedia: metadata.hasProductMedia ?? false,
    section: metadata.section ?? null
  };
}

async function sendFirstPartyEvent(event: EventName, metadata: EventMetadata = {}, attribution = getAttribution(), path = window.location.pathname) {
  const body = {
    sessionId: getSessionId(),
    event,
    path,
    attribution: {
      ccQr: attribution.ccQr,
      ccCampaign: attribution.ccCampaign,
      ccVariant: attribution.ccVariant
    },
    metadata: safeMetadata(metadata)
  };

  try {
    await fetch("/api/v1/public/prelaunch/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body)
    });
  } catch {
    // Analytics nunca pode interromper o fluxo de cadastro.
  }
}

function sendVendorEvent(event: EventName, metadata: EventMetadata = {}) {
  const gtag = analyticsWindow.gtag as undefined | ((...args: unknown[]) => void);
  if (gtag) gtag("event", event, safeMetadata(metadata));
  const clarity = analyticsWindow.clarity as undefined | ((...args: unknown[]) => void);
  if (clarity) clarity("event", event);
}

function track(event: EventName, metadata: EventMetadata = {}) {
  const consent = getAnalyticsConsent();
  if (consent === "denied") return;
  if (consent === "unknown") {
    if (pendingEvents.length < 100) pendingEvents.push({ event, metadata, attribution: { ...getAttribution() }, path: window.location.pathname });
    return;
  }
  void sendFirstPartyEvent(event, metadata);
  sendVendorEvent(event, metadata);
}

const documentEvents = new Set<string>();
function trackOnce(event: EventName, metadata: EventMetadata = {}) {
  const key = window.location.pathname + window.location.search + ':' + event;
  if (documentEvents.has(key)) return;
  documentEvents.add(key);
  track(event, metadata);
}

function loadAnalyticsVendors() {
  if (vendorsLoaded) return;
  vendorsLoaded = true;

  const gaId = import.meta.env.VITE_GA4_ID?.trim();
  if (gaId) {
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    analyticsWindow.gtag = function (...args: unknown[]) { analyticsWindow.dataLayer!.push(args); };
    analyticsWindow.gtag("js", new Date());
    analyticsWindow.gtag("config", gaId, { send_page_view: false, anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }

  const clarityId = import.meta.env.VITE_CLARITY_ID?.trim();
  if (clarityId) {
    analyticsWindow.clarity = analyticsWindow.clarity || function (...args: unknown[]) {
      (analyticsWindow.clarity!.q = analyticsWindow.clarity!.q || []).push(args);
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
    document.head.appendChild(script);
  }
}

function grantAnalytics() {
  writeStorage("local", analyticsConsentKey, "granted");
  loadAnalyticsVendors();
  void sendFirstPartyEvent("consent_analytics_granted");
  sendVendorEvent("consent_analytics_granted");
  for (const queued of pendingEvents.splice(0)) {
    void sendFirstPartyEvent(queued.event, queued.metadata, queued.attribution, queued.path);
    sendVendorEvent(queued.event, queued.metadata);
  }
}

function denyAnalytics() {
  writeStorage("local", analyticsConsentKey, "denied");
  pendingEvents.splice(0);
}


export { getAnalyticsConsent, track, trackOnce, loadAnalyticsVendors, grantAnalytics, denyAnalytics };
