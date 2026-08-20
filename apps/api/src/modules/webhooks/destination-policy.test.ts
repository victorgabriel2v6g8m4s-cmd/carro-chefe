import { describe, expect, it } from "vitest";
import { isPublicAddress, validateWebhookDestination } from "./destination-policy";
import { hasValidWebhookSignature, webhookSignature } from "./signature";

describe("segurança de webhooks", () => {
  it("aceita apenas HTTPS resolvido integralmente para endereços públicos", async () => {
    const publicResolver = async () => [{ address: "93.184.216.34" }];
    await expect(validateWebhookDestination("https://hooks.example/events", publicResolver)).resolves.toBe("https://hooks.example/events");
    await expect(validateWebhookDestination("http://hooks.example/events", publicResolver)).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateWebhookDestination("https://user:secret@hooks.example/events", publicResolver)).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateWebhookDestination("https://localhost/events", publicResolver)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("bloqueia IP literal, DNS privado e faixas IPv6 internas", async () => {
    const privateResolver = async () => [{ address: "10.10.0.8" }];
    await expect(validateWebhookDestination("https://127.0.0.1/events")).rejects.toMatchObject({ statusCode: 400 });
    await expect(validateWebhookDestination("https://hooks.example/events", privateResolver)).rejects.toMatchObject({ statusCode: 400 });
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("fd00::8")).toBe(false);
    expect(isPublicAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(true);
  });

  it("compara a assinatura HMAC sem aceitar segredo ou assinatura ausente", () => {
    const payload = JSON.stringify({ id: "evt-1" });
    const signature = webhookSignature(payload, "segredo-de-teste");
    expect(hasValidWebhookSignature(payload, signature, "segredo-de-teste")).toBe(true);
    expect(hasValidWebhookSignature(payload, `${signature}0`, "segredo-de-teste")).toBe(false);
    expect(hasValidWebhookSignature(payload, undefined, "segredo-de-teste")).toBe(false);
  });
});
