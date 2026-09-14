import { describe, expect, it } from "vitest";
import {
  normalizeBrazilWhatsappPhone,
  normalizeOptionalFirstName,
  resolveFirstSeenAt,
  sanitizeTrackingValue
} from "./service";

describe("prelaunch service", () => {
  it.each([
    "67992046721",
    "(67) 99204-6721",
    "+55 67 99204-6721"
  ])("normaliza formatos equivalentes de WhatsApp: %s", (input) => {
    expect(normalizeBrazilWhatsappPhone(input)).toBe("+5567992046721");
  });

  it("rejeita números obviamente inválidos", () => {
    expect(normalizeBrazilWhatsappPhone("123")).toBeNull();
    expect(normalizeBrazilWhatsappPhone("11111111111")).toBeNull();
    expect(normalizeBrazilWhatsappPhone("67123456789")).toBeNull();
  });

  it("limpa o primeiro nome sem torná-lo obrigatório", () => {
    expect(normalizeOptionalFirstName("  Ana   Maria  ")).toBe("Ana Maria");
    expect(normalizeOptionalFirstName("   ")).toBeNull();
    expect(normalizeOptionalFirstName(null)).toBeNull();
  });

  it("aceita apenas identificadores controlados de atribuição", () => {
    expect(sanitizeTrackingValue("QR-20260911-AV01")).toBe("QR-20260911-AV01");
    expect(sanitizeTrackingValue("pre_inauguracao")).toBe("pre_inauguracao");
    expect(sanitizeTrackingValue("banner avenida?a=1")).toBeNull();
  });

  it("não confia em firstSeenAt muito antigo ou futuro", () => {
    const now = new Date("2026-09-12T04:00:00.000Z");
    expect(resolveFirstSeenAt("2026-09-12T03:50:00.000Z", now).toISOString()).toBe("2026-09-12T03:50:00.000Z");
    expect(resolveFirstSeenAt("2027-09-12T03:50:00.000Z", now)).toEqual(now);
    expect(resolveFirstSeenAt("2025-01-01T00:00:00.000Z", now)).toEqual(now);
  });
});
