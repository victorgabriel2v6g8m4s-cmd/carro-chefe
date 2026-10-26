import { describe, expect, it } from "vitest";
import { resolveVipConsentNavigation, vipTermsVersion } from "./vip-consent-navigation";

describe("VIP consent redirect", () => {
  it("opens the invitation once for an invited member with current consent", () => {
    const result = resolveVipConsentNavigation("/perfil", "?vip-consented=1&tab=benefits", {
      status: "invited", consentVersion: vipTermsVersion, consentedAt: "2026-10-26T21:00:00.000Z"
    });

    expect(result).toEqual({ shouldShowInvite: true, pathname: "/perfil", search: "?tab=benefits" });
  });

  it("consumes the redirect without reopening the dialog after enrollment", () => {
    const result = resolveVipConsentNavigation("/perfil", "?vip-consented=1", {
      status: "active", consentVersion: vipTermsVersion, consentedAt: "2026-10-26T21:00:00.000Z"
    });

    expect(result).toEqual({ shouldShowInvite: false, pathname: "/perfil", search: "" });
  });

  it("does not show the invitation for missing or outdated consent", () => {
    expect(resolveVipConsentNavigation("/perfil", "?vip-consented=1", {
      status: "invited", consentVersion: null, consentedAt: null
    })?.shouldShowInvite).toBe(false);
    expect(resolveVipConsentNavigation("/perfil", "?tab=benefits", null)).toBeNull();
  });
});
