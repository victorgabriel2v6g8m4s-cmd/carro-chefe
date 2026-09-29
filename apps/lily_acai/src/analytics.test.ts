import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); }
  };
}

beforeEach(() => {
  vi.resetModules();
  const local = memoryStorage();
  const session = memoryStorage();
  const dispatchEvent = vi.fn();

  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", {
    localStorage: local,
    sessionStorage: session,
    location: {
      pathname: "/lilyacai/cardapio",
      search: "?la_qr=LILY1&la_campaign=adesivos&la_variant=a"
    },
    dispatchEvent
  });
  vi.stubGlobal("CustomEvent", class {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  });
  vi.stubGlobal("Event", class {
    type: string;
    constructor(type: string) { this.type = type; }
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CookLily analytics client consent", () => {
  it("não transmite antes de consentimento e envia a fila somente após opt-in", async () => {
    const analytics = await import("./analytics");

    analytics.trackLilyAnalytics("catalog_view", { surface: "catalog" });
    expect(fetch).not.toHaveBeenCalled();

    analytics.grantLilyAnalytics();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    const bodies = (fetch as any).mock.calls.map((call: any[]) => JSON.parse(call[1].body));
    expect(bodies.map((body: any) => body.event)).toEqual([
      "catalog_view",
      "analytics_consent_granted"
    ]);
    expect(bodies[0].path).toBe("/lilyacai/cardapio");
    expect(bodies[0].attribution).toEqual({
      la_qr: "LILY1",
      la_campaign: "adesivos",
      la_variant: "a"
    });
  });

  it("descarta a fila e não transmite após recusa", async () => {
    const analytics = await import("./analytics");

    analytics.trackLilyAnalytics("catalog_view", { surface: "catalog" });
    analytics.denyLilyAnalytics();
    analytics.trackLilyAnalytics("product_view", {
      surface: "product",
      productSlug: "acai-nutella"
    });
    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
    expect(analytics.getLilyAnalyticsConsent()).toBe("denied");
  });

  it("não envia query string ou PII livre no envelope", async () => {
    const analytics = await import("./analytics");
    analytics.grantLilyAnalytics();
    await Promise.resolve();
    vi.mocked(fetch).mockClear();

    analytics.trackLilyAnalytics("add_to_cart", {
      surface: "product",
      productSlug: "acai-nutella",
      variantSizeMl: 500,
      addonCount: 2,
      itemCount: 1
    });
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetch as any).mock.calls[0][1].body));
    const serialized = JSON.stringify(body);
    expect(body.path).toBe("/lilyacai/cardapio");
    expect(serialized).not.toContain("phone");
    expect(serialized).not.toContain("address");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("?");
  });
});
