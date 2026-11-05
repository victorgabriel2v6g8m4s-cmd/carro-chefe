import type { LilyWhatsAppStage } from "./whatsapp";
import { createLilyOrderAccessLink } from "./order-access-link";

export const LILY_WHATSAPP_TEMPLATE_VARIABLES = [
  "orderNumber",
  "stageLabel",
  "itemsSummary",
  "totalAmount",
  "deliveryEta"
] as const;

export type LilyWhatsAppTemplateVariable = typeof LILY_WHATSAPP_TEMPLATE_VARIABLES[number];

type OrderItemSnapshot = {
  productNameSnapshot: string;
  variantNameSnapshot: string;
  quantity: number;
  addons: Array<{ addonNameSnapshot: string; quantity: number }>;
};

export type WhatsAppOrderSnapshot = {
  id: string;
  orderNumber: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  restaurantPrepEstimateMinutes: number | null;
  routeEstimate: { durationSeconds: number; calculatedAt: Date } | null;
  items: OrderItemSnapshot[];
};

type MetaComponent = Record<string, unknown> & { type?: unknown };

export function isSafeOperationalTemplateComponents(components: MetaComponent[]) {
  if (components.filter((component) => component.type === "BODY").length !== 1) return false;
  if (components.some((component) => !["BODY", "FOOTER", "BUTTONS"].includes(String(component.type)))) return false;
  if (components.filter((component) => component.type === "BUTTONS").length > 1) return false;

  const buttonsComponent = components.find((component) => component.type === "BUTTONS");
  if (!buttonsComponent) return true;
  if (!Array.isArray(buttonsComponent.buttons) || buttonsComponent.buttons.length < 1 || buttonsComponent.buttons.length > 3) return false;

  return buttonsComponent.buttons.every((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const button = candidate as Record<string, unknown>;
    if (typeof button.text !== "string" || button.text.trim().length < 1 || button.text.length > 25) return false;
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

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function itemsSummary(items: OrderItemSnapshot[]) {
  if (!items.length) return "Itens do pedido CookLily";
  return items.map((item) => {
    const addons = item.addons.length
      ? ` com ${item.addons.map((addon) => `${addon.quantity > 1 ? `${addon.quantity}x ` : ""}${addon.addonNameSnapshot}`).join(", ")}`
      : "";
    return `${item.quantity}x ${item.productNameSnapshot} (${item.variantNameSnapshot})${addons}`;
  }).join("; ").slice(0, 900);
}

function deliveryEta(order: WhatsAppOrderSnapshot) {
  const seconds = order.routeEstimate?.durationSeconds;
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return `aproximadamente ${Math.max(1, Math.ceil(seconds / 60))} min`;
  }
  if (typeof order.restaurantPrepEstimateMinutes === "number" && order.restaurantPrepEstimateMinutes > 0) {
    return `preparo estimado em ${order.restaurantPrepEstimateMinutes} min; entrega a confirmar`;
  }
  return "a confirmar pela loja";
}

function resolveVariable(variable: string, order: WhatsAppOrderSnapshot, stageLabel: string): string {
  switch (variable) {
    case "orderNumber": return order.orderNumber;
    case "stageLabel": return stageLabel;
    case "itemsSummary": return itemsSummary(order.items);
    case "totalAmount": return money(order.grandTotalCents);
    case "deliveryEta": return deliveryEta(order);
    default: throw new Error(`Variável WhatsApp não suportada: ${variable}`);
  }
}

export function renderOrderTemplateComponents(input: {
  order: WhatsAppOrderSnapshot;
  stage: LilyWhatsAppStage;
  stageLabel: string;
  variables: string[];
  components: MetaComponent[];
}) {
  const body = {
    type: "body",
    parameters: input.variables.map((variable) => ({
      type: "text",
      text: resolveVariable(variable, input.order, input.stageLabel)
    }))
  };
  const rendered: Array<Record<string, unknown>> = input.variables.length ? [body] : [];
  const buttonsComponent = input.components.find((component) => component.type === "BUTTONS");
  const buttons = Array.isArray(buttonsComponent?.buttons) ? buttonsComponent.buttons : [];

  buttons.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return;
    const button = candidate as Record<string, unknown>;
    if (button.type !== "URL" || typeof button.url !== "string" || !button.url.includes("{{1}}")) return;
    rendered.push({
      type: "button",
      sub_type: "url",
      index: String(index),
      parameters: [{ type: "text", text: createLilyOrderAccessLink(input.order.id) }]
    });
  });
  return rendered;
}
