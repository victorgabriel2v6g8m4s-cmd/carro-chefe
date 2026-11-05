import type { JsonValue, MetaTemplateComponent, MetaTemplatePayload, TemplateDraft } from "./template-types";

export const emptyTemplate: TemplateDraft = {
  key: "",
  displayName: "",
  category: "utility",
  language: "pt_BR",
  bodyTemplate: "",
  variables: [],
  variableNames: [],
  flow: [],
  metaTemplateName: "",
  components: [{ type: "BODY", text: "" }]
};

export function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 8) return false;
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.length <= 100 && value.every((item) => isJsonValue(item, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value);
  return entries.length <= 80 && entries.every(([key, item]) => key.length <= 120 && isJsonValue(item, depth + 1));
}

export function componentText(components: MetaTemplateComponent[], type: string) {
  const found = components.find((component) => component.type === type);
  return typeof found?.text === "string" ? found.text : "";
}

export function upsertComponent(components: MetaTemplateComponent[], component: MetaTemplateComponent) {
  const index = components.findIndex((current) => current.type === component.type);
  if (index < 0) return [...components, component];
  return components.map((current, currentIndex) => currentIndex === index ? component : current);
}

export function textVariables(components: MetaTemplateComponent[]) {
  const source = components.map((component) => typeof component.text === "string" ? component.text : "").join(" ");
  return [...new Set(Array.from(source.matchAll(/\{\{\s*(\d+)\s*\}\}/g), (match) => Number(match[1])))].sort((a, b) => a - b);
}

export function renderText(text: string, values: Record<number, string>) {
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, number: string) => values[Number(number)] || `[${number}]`);
}

export function renderTemplateMessage(components: MetaTemplateComponent[], values: Record<number, string>) {
  const hasOtpButton = components.some((component) => component.type === "BUTTONS" && Array.isArray(component.buttons) &&
    component.buttons.some((button) => button && typeof button === "object" && !Array.isArray(button) && button.type === "OTP"));
  return components.flatMap((component) => {
    const text = typeof component.text === "string" ? renderText(component.text, values).trim() : "";
    if (component.type === "HEADER") {
      const format = typeof component.format === "string" ? component.format.toLowerCase() : "text";
      return text ? [`${text}`] : format !== "text" ? [`[${format} de demonstração]`] : [];
    }
    if (component.type === "BODY" && text) return [text];
    if (component.type === "BODY" && hasOtpButton) return ["123456 é seu código de verificação."];
    if (component.type === "FOOTER" && text) return [text];
    if (component.type === "BUTTONS" && Array.isArray(component.buttons)) {
      return component.buttons.flatMap((button) => {
        if (!button || typeof button !== "object" || Array.isArray(button)) return [];
        const buttonText = "type" in button && button.type === "OTP"
          ? "otp_type" in button && button.otp_type === "COPY_CODE" ? "Copiar código"
            : "otp_type" in button && button.otp_type === "ZERO_TAP" ? "Verificação sem toque" : "Preencher código"
          : "text" in button && typeof button.text === "string" ? button.text : "";
        return buttonText ? [`[${buttonText}]`] : [];
      });
    }
    return [];
  });
}

export function makeMetaPayload(draft: TemplateDraft): MetaTemplatePayload {
  return {
    name: draft.key,
    language: draft.language,
    category: draft.category.toUpperCase() as Uppercase<TemplateDraft["category"]>,
    components: draft.components
  };
}

export function bodyTemplateFrom(components: MetaTemplateComponent[]) {
  return componentText(components, "BODY");
}

export function supportsOperationalNotificationTemplate(
  key: string,
  category: TemplateDraft["category"],
  components: MetaTemplateComponent[],
  operationalStages: string[]
) {
  if (!operationalStages.includes(key) || category !== "utility") return false;
  if (components.filter((component) => component.type === "BODY").length !== 1) return false;
  if (components.some((component) => !["BODY", "FOOTER", "BUTTONS"].includes(component.type))) return false;
  const buttonComponents = components.filter((component) => component.type === "BUTTONS");
  if (buttonComponents.length > 1) return false;
  const buttons = buttonComponents[0]?.buttons;
  if (!buttonComponents.length) return true;
  if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 3) return false;

  return buttons.every((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const button = candidate as Record<string, unknown>;
    if (typeof button.text !== "string" || !button.text.trim() || button.text.length > 25) return false;
    if (button.type === "QUICK_REPLY") return true;
    if (button.type !== "URL" || typeof button.url !== "string" || button.url.length > 2000) return false;
    if (/\{\{(?!1\}\})\d+\}\}/.test(button.url) || (button.url.match(/\{\{1\}\}/g)?.length ?? 0) > 1) return false;

    try {
      const url = new URL(button.url.replace("{{1}}", "ORDER"));
      return url.protocol === "https:"
        && ((url.hostname === "licalily.com" && url.pathname.startsWith("/cook/"))
          || (url.hostname === "carrochefe.com" && url.pathname.startsWith("/lilyacai/")));
    } catch {
      return false;
    }
  });
}

export function validateComponents(value: unknown): MetaTemplateComponent[] | null {
  if (!Array.isArray(value) || value.length > 10 || !isJsonValue(value)) return null;
  if (!value.every((item) => item && typeof item === "object" && !Array.isArray(item) && "type" in item && typeof item.type === "string" && /^[A-Z_]{2,40}$/.test(item.type))) return null;
  return value as MetaTemplateComponent[];
}
