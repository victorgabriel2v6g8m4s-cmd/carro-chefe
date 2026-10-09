import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyLilyWhatsAppWebhookSignature,
  verifyLilyWhatsAppWebhookToken
} from "./whatsapp";

describe("CookLily Meta WhatsApp webhook verification", () => {
  it("accepts the exact raw body signed with the Meta app secret", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const secret = "test-app-secret";
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

    expect(verifyLilyWhatsAppWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyLilyWhatsAppWebhookSignature(body + " ", signature, secret)).toBe(false);
    expect(verifyLilyWhatsAppWebhookSignature(body, signature, "other-secret")).toBe(false);
  });

  it("rejects malformed signatures and compares verification tokens safely", () => {
    expect(verifyLilyWhatsAppWebhookSignature("{}", "sha256=bad", "secret")).toBe(false);
    expect(verifyLilyWhatsAppWebhookToken("verify-token", "verify-token")).toBe(true);
    expect(verifyLilyWhatsAppWebhookToken("verify-token", "wrong-token")).toBe(false);
    expect(verifyLilyWhatsAppWebhookToken("short", "longer-token")).toBe(false);
  });
});
