import { lilyAdminJson, parseResponse, uploadLilyMedia } from "../../api";
import type { AuthPayload } from "../../api";
import type { LilyLandingPageConfig } from "@carro-chefe/contracts";
import type { LandingMedia, LandingOption, PublicLandingPage } from "./landing-types";

export async function getPublicLandingPage() {
  const response = await fetch("/api/v1/lily/public/landing", { credentials: "same-origin" });
  return parseResponse<PublicLandingPage>(response);
}

export async function getAdminLandingPage() {
  const response = await fetch("/api/v1/lily/admin/landing", { credentials: "same-origin" });
  return parseResponse<{ config: LilyLandingPageConfig; media: LandingMedia[] }>(response);
}

export async function getLandingOptions(kind: "product" | "showcase" | "social" | "page") {
  const response = await fetch(`/api/v1/lily/admin/landing/options?kind=${kind}`, { credentials: "same-origin" });
  return parseResponse<{ options: LandingOption[] }>(response);
}

export async function saveLandingPage(config: LilyLandingPageConfig, csrfToken: string) {
  return lilyAdminJson<{ config: LilyLandingPageConfig }>("landing", "PUT", csrfToken, config);
}

export async function uploadLandingMedia(file: File, csrfToken: string) {
  return uploadLilyMedia(file, csrfToken);
}

export type LandingAdminSession = AuthPayload;
