import type { LilyLandingPageConfig } from "@carro-chefe/contracts";

export type LandingMedia = { id: string; url: string; altText: string; originalName?: string; mime?: string };
export type PublicLandingPage = Omit<LilyLandingPageConfig, "banner"> & {
  banner: Omit<LilyLandingPageConfig["banner"], "desktopMediaId" | "mobileMediaId"> & { desktopImage: LandingMedia | null; mobileImage: LandingMedia | null; productTarget: { id: string; slug: string } | null };
  address: string | null;
};
export type LandingOption = { id: string; label: string; path?: string; url?: string; slug?: string; available?: boolean };
