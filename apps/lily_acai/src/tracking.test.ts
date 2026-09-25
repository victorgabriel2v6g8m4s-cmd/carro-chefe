import { describe, expect, it } from "vitest";
import { readCookLilyAttribution } from "./tracking";

describe("CookLily attribution aliases", () => {
  it("lê parâmetros canônicos la_*", () => {
    expect(readCookLilyAttribution("?la_qr=LILY-1&la_campaign=adesivos&la_variant=a")).toEqual({
      laQr: "LILY-1",
      laCampaign: "adesivos",
      laVariant: "a"
    });
  });

  it("aceita cc_* legado e normaliza para campos la*", () => {
    expect(readCookLilyAttribution("?cc_qr=LILY1&cc_campaign=adesivos&cc_variant=v1")).toEqual({
      laQr: "LILY1",
      laCampaign: "adesivos",
      laVariant: "v1"
    });
  });

  it("prefere la_* quando os dois namespaces coexistem", () => {
    expect(readCookLilyAttribution("?la_qr=NOVO&cc_qr=ANTIGO").laQr).toBe("NOVO");
  });
});
