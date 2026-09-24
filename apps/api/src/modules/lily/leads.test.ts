import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import { buildApp } from "../../app";
import { LILY_MARKETING_VERSION, LILY_PRIVACY_VERSION } from "./auth";

const app = await buildApp();
const origin = "http://127.0.0.1:4173";

beforeEach(async () => {
  await lilyPrisma.lilyMarketingLead.deleteMany();
});

afterAll(async () => {
  await app.close();
});

function payload(overrides: Record<string, unknown> = {}) {
  return {
    phone: "(67) 99928-9187",
    marketingConsent: true,
    consentVersion: LILY_MARKETING_VERSION,
    privacyPolicyVersion: LILY_PRIVACY_VERSION,
    website: "",
    ...overrides
  };
}

describe("CookLily marketing leads", () => {
  it("persiste telefone com opt-in explícito", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: payload()
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });

    const lead = await lilyPrisma.lilyMarketingLead.findUnique({ where: { phoneNormalized: "+5567999289187" } });
    expect(lead).toMatchObject({
      status: "subscribed",
      consentVersion: LILY_MARKETING_VERSION,
      privacyVersion: LILY_PRIVACY_VERSION
    });
  });

  it("normaliza cc_* legado para campos la*", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: payload({
        attribution: {
          cc_qr: "LILY1",
          cc_campaign: "adesivos",
          cc_variant: "rosa"
        }
      })
    });
    expect(response.statusCode).toBe(202);
    const lead = await lilyPrisma.lilyMarketingLead.findUnique({ where: { phoneNormalized: "+5567999289187" } });
    expect(lead).toMatchObject({ laQr: "LILY1", laCampaign: "adesivos", laVariant: "rosa" });
  });

  it("prefere la_* quando alias legado também existe", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: payload({ attribution: { la_qr: "NOVO", cc_qr: "ANTIGO" } })
    });
    const lead = await lilyPrisma.lilyMarketingLead.findUnique({ where: { phoneNormalized: "+5567999289187" } });
    expect(lead?.laQr).toBe("NOVO");
  });

  it("não cria duplicata e não revela se telefone já existia", async () => {
    const first = await app.inject({
      method: "POST", url: "/api/v1/lily/public/leads", headers: { origin },
      payload: payload({ attribution: { la_campaign: "primeira" } })
    });
    const repeated = await app.inject({
      method: "POST", url: "/api/v1/lily/public/leads", headers: { origin },
      payload: payload({ attribution: { la_campaign: "segunda" } })
    });

    expect(first.statusCode).toBe(202);
    expect(repeated.statusCode).toBe(202);
    expect(first.json()).toEqual(repeated.json());
    expect(await lilyPrisma.lilyMarketingLead.count()).toBe(1);
    expect((await lilyPrisma.lilyMarketingLead.findFirst())?.laCampaign).toBe("segunda");
  });

  it("não persiste sem opt-in de marketing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: { ...payload(), marketingConsent: false }
    });
    expect(response.statusCode).toBe(400);
    expect(await lilyPrisma.lilyMarketingLead.count()).toBe(0);
  });

  it("honeypot responde aceito sem persistir PII", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: payload({ website: "https://spam.invalid" })
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(await lilyPrisma.lilyMarketingLead.count()).toBe(0);
  });

  it("rejeita telefone inválido", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/lily/public/leads",
      headers: { origin },
      payload: payload({ phone: "123" })
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().details.code).toBe("LILY_INVALID_PHONE");
  });
});
