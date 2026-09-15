import { afterEach, describe, expect, it, vi } from "vitest";
import { getAttribution, isBannerVipCampaign, readAttribution } from "./campaign";

afterEach(() => vi.unstubAllGlobals());

describe("atribuição da entrada atual", () => {
  it("distingue direto, banner válido e campanhas desconhecidas", () => {
    expect(isBannerVipCampaign(readAttribution(""))).toBe(false);
    expect(isBannerVipCampaign(readAttribution("?cc_qr=QR-001&cc_campaign=banner"))).toBe(true);
    expect(isBannerVipCampaign(readAttribution("?cc_qr=QR-002&cc_campaign=banner"))).toBe(false);
    expect(isBannerVipCampaign(readAttribution("?cc_campaign=banner"))).toBe(false);
  });
  it("acompanha direto → QR → direto, sem herdar campanha anterior", () => {
    const location = { search: "" };
    vi.stubGlobal("window", { location });
    expect(getAttribution().ccCampaign).toBeNull();
    location.search = "?cc_qr=QR-001&cc_campaign=banner&cc_variant=A";
    expect(isBannerVipCampaign(getAttribution())).toBe(true);
    expect(getAttribution().ccVariant).toBe("A");
    location.search = "";
    expect(getAttribution().ccQr).toBeNull();
  });
  it("não usa dados corrompidos de storage e rejeita identificadores inválidos", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); } });
    expect(readAttribution("?cc_qr=%3Cscript%3E&cc_campaign=" + "a".repeat(121)).ccQr).toBeNull();
    expect(readAttribution("?cc_campaign=" + "a".repeat(121)).ccCampaign).toBeNull();
    expect(readAttribution("?cc_variant=%20A%20").ccVariant).toBe("A");
  });
});
