import { parseResponse } from "../../api";
import type { MetaTemplateComponent, TemplateCategory } from "./template-studio/template-types";

export type WhatsAppSettings = {
  provider: string;
  supported: boolean;
  ready: boolean;
  credentials: Record<"accessTokenConfigured" | "phoneNumberIdConfigured" | "graphVersionConfigured" | "templateConfigured" | "languageConfigured", boolean>;
  queue: { pending: number; failed: number; dead: number };
  templates: { total: number; operationalStages: string[] };
  webhook: { verifyTokenConfigured: boolean; appSecretConfigured: boolean };
  consentVersion: string;
};

export type WhatsAppTemplate = {
  id: string;
  key: string;
  displayName: string;
  category: TemplateCategory;
  language: string;
  bodyTemplate: string;
  variables: Array<"orderNumber" | "stageLabel">;
  variableNames: string[];
  flow: import("./template-studio/template-types").SimulationNode[];
  components: MetaTemplateComponent[];
  metaTemplateName: string | null;
  status: "draft" | "active" | "archived";
  updatedAt: string;
};

export async function getWhatsAppSimulator() {
  return parseResponse<{ pricing: import("./template-studio/template-pricing").PricingConfig | null; flows: Record<string, import("./template-studio/template-types").SimulationNode[]> }>(await fetch("/api/v1/lily/admin/whatsapp/simulator", { credentials: "same-origin", cache: "no-store" }));
}

export async function saveWhatsAppSimulator(csrf: string, pricing: import("./template-studio/template-pricing").PricingConfig) {
  return parseResponse<{ pricing: import("./template-studio/template-pricing").PricingConfig }>(await fetch("/api/v1/lily/admin/whatsapp/simulator", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf }, body: JSON.stringify({ pricing }) }));
}

export async function saveWhatsAppTemplateFlow(key: string, csrf: string, nodes: import("./template-studio/template-types").SimulationNode[]) {
  return parseResponse<{ key: string; nodes: import("./template-studio/template-types").SimulationNode[] }>(await fetch(`/api/v1/lily/admin/whatsapp/templates/${encodeURIComponent(key)}/flow`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf }, body: JSON.stringify(nodes) }));
}

export type WhatsAppNotification = {
  id: string;
  orderNumber: string;
  stage: string;
  status: string;
  attempts: number;
  provider: string;
  lastErrorCode: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export async function getWhatsAppSettings() {
  return parseResponse<WhatsAppSettings>(await fetch("/api/v1/lily/admin/whatsapp/settings", { credentials: "same-origin", cache: "no-store" }));
}

export async function getWhatsAppTemplates() {
  return parseResponse<{ templates: WhatsAppTemplate[] }>(await fetch("/api/v1/lily/admin/whatsapp/templates?limit=100", { credentials: "same-origin", cache: "no-store" }));
}

export async function installWhatsAppStarterTemplates(csrf: string) {
  return parseResponse<{ created: number; existing: number; total: number }>(await fetch("/api/v1/lily/admin/whatsapp/templates/starter-pack", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf }, body: "{}"
  }));
}

export async function getWhatsAppNotifications(status = "") {
  const query = new URLSearchParams({ limit: "100", ...(status ? { status } : {}) });
  return parseResponse<{ notifications: WhatsAppNotification[] }>(await fetch(`/api/v1/lily/admin/whatsapp/notifications?${query}`, { credentials: "same-origin", cache: "no-store" }));
}

export async function mutateWhatsApp<T>(path: string, method: "POST" | "PATCH", csrf: string, body: unknown) {
  return parseResponse<T>(await fetch(`/api/v1/lily/admin/whatsapp/${path}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf },
    body: JSON.stringify(body)
  }));
}
