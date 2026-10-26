export const vipTermsVersion = "cooklily-vip-2026-10-v1";

type MembershipForInvite = {
  status: string;
  consentVersion: string | null;
  consentedAt: string | null;
} | null;

export function resolveVipConsentNavigation(pathname: string, search: string, membership: MembershipForInvite) {
  const params = new URLSearchParams(search);
  if (params.get("vip-consented") !== "1") return null;

  params.delete("vip-consented");
  const shouldShowInvite = membership?.status === "invited"
    && Boolean(membership.consentedAt)
    && membership.consentVersion === vipTermsVersion;

  return {
    shouldShowInvite,
    pathname,
    search: params.size ? `?${params}` : ""
  };
}
