import { afterEach, describe, expect, it } from "vitest";
import { decryptWhatsAppPrivateValue, encryptWhatsAppPrivateValue, hashWhatsAppContact } from "./crypto";
import { classifyInboundMessage, validateAssistantReply } from "./guardrails";

const previousKey = process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY;
const testKey = Buffer.alloc(32, 7).toString("base64url");

afterEach(() => {
  if (previousKey === undefined) delete process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY;
  else process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY = previousKey;
});

describe("WhatsApp AI security primitives", () => {
  it("encrypts message values and authenticates ciphertext", () => {
    process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY = testKey;
    const ciphertext = encryptWhatsAppPrivateValue("mensagem privada");
    expect(ciphertext).not.toContain("mensagem privada");
    expect(decryptWhatsAppPrivateValue(ciphertext)).toBe("mensagem privada");
    const [version, nonce, tag, encrypted] = ciphertext.split(".");
    const replacement = encrypted!.startsWith("A") ? "B" : "A";
    const tampered = [version, nonce, tag, `${replacement}${encrypted!.slice(1)}`].join(".");
    expect(() => decryptWhatsAppPrivateValue(tampered)).toThrow();
  });

  it("uses a deterministic, non-reversible contact index", () => {
    process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY = testKey;
    const first = hashWhatsAppContact("+5567999999999");
    expect(first).toBe(hashWhatsAppContact("+5567999999999"));
    expect(first).not.toContain("5567999999999");
    expect(hashWhatsAppContact("+5567999999998")).not.toBe(first);
  });

  it("routes opt-out, sensitive and private-order requests before the model", () => {
    expect(classifyInboundMessage("SAIR")).toBe("opt_out");
    expect(classifyInboundMessage("Tenho alergia a amendoim")).toBe("human");
    expect(classifyInboundMessage("onde está meu pedido?")).toBe("private_data");
    expect(classifyInboundMessage("quais sabores existem?")).toBe("answer");
  });

  it("rejects claims of completed transactional actions and external links", () => {
    expect(validateAssistantReply("Seu pagamento foi confirmado.")).toBeNull();
    expect(validateAssistantReply("Acompanhe em https://example.test")).toBeNull();
    expect(validateAssistantReply("Temos sabores de açaí e cupuaçu.")).toBe("Temos sabores de açaí e cupuaçu.");
  });
});
