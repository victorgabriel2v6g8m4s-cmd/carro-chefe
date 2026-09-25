import { describe, expect, it } from "vitest";
import { normalizeLilyAttribution } from "./attribution";

describe("CookLily attribution normalization", () => {
  it("normaliza alias cc_* para modelo la*", () => {
    expect(normalizeLilyAttribution({ cc_qr: "LILY1", cc_campaign: "adesivos", cc_variant: "a" })).toEqual({
      laQr: "LILY1",
      laCampaign: "adesivos",
      laVariant: "a"
    });
  });

  it("prefere namespace canônico la_*", () => {
    expect(normalizeLilyAttribution({ la_qr: "NOVO", cc_qr: "ANTIGO" }).laQr).toBe("NOVO");
  });

  it("remove caracteres de controle e limita comprimento", () => {
    const result = normalizeLilyAttribution({ cc_qr: "A\u0000B" + "x".repeat(200) }).laQr;
    expect(result?.startsWith("AB")).toBe(true);
    expect(result?.length).toBe(120);
  });
});
