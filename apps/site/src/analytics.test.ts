import { afterEach, beforeEach, expect, it, vi } from "vitest";

let local: Map<string, string>;
let session: Map<string, string>;
let location: { pathname: string; search: string };
const storage = (map: Map<string, string>) => ({ getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value) });
const sent = () => vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)));

beforeEach(() => {
  vi.resetModules();
  local = new Map(); session = new Map(); location = { pathname: "/", search: "" };
  vi.stubGlobal("window", { location, localStorage: storage(local), sessionStorage: storage(session) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => vi.unstubAllGlobals());

it("não envia medição quando recusada", async () => {
  const analytics = await import("./analytics");
  analytics.track("landing_view");
  analytics.denyAnalytics();
  analytics.track("signup_success");
  expect(fetch).not.toHaveBeenCalled();
});

it("preserva a origem dos eventos em espera ao permitir medição", async () => {
  const analytics = await import("./analytics");
  analytics.track("landing_view");
  location.search = "?cc_qr=QR-001&cc_campaign=banner";
  analytics.track("signup_cta_click");
  analytics.grantAnalytics();
  expect(sent().find(event => event.event === "landing_view").attribution.ccCampaign).toBeNull();
  expect(sent().find(event => event.event === "signup_cta_click").attribution.ccCampaign).toBe("banner");
  expect(sent().every(event => !JSON.stringify(event).includes("phone"))).toBe(true);
});

it("deduplica efeito React, mas conta nova carga com a mesma sessão", async () => {
  local.set("carrochefe.analytics-consent.v1", "granted");
  const first = await import("./analytics");
  first.trackOnce("landing_view"); first.trackOnce("landing_view");
  expect(sent()).toHaveLength(1);
  vi.resetModules();
  const next = await import("./analytics");
  next.trackOnce("landing_view");
  expect(sent()).toHaveLength(2);
  expect(sent()[1].sessionId).toBe(sent()[0].sessionId);
});

it("continua funcionando quando storage está bloqueado", async () => {
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  vi.stubGlobal("window", { location, localStorage: blocked, sessionStorage: blocked });
  const analytics = await import("./analytics");
  analytics.grantAnalytics();
  analytics.track("whatsapp_click");
  expect(sent()).toHaveLength(2);
  expect(sent()[1].sessionId).toBe(sent()[0].sessionId);
});
