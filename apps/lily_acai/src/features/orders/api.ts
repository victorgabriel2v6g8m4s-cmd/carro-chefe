import { parseResponse, type AuthPayload } from "../../api";
import type { CartItem } from "../cart/types";

export type LilyAddressInput = {
  label?: string | null;
  postalCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string | null;
};

export type FulfillmentSettings = {
  ordersEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  minimumOrderCents: number;
  deliveryStrategy: "flat" | "zone";
  flatDeliveryFeeCents: number;
  pickupAddressText: string | null;
  pickupInstructions: string | null;
  businessHours: Array<{ dayOfWeek: number; opensAt: string; closesAt: string }>;
  timezone: string;
  openNow: boolean;
  zones: Array<{ id: string; name: string; feeCents: number; minimumOrderCents: number }>;
};

type ProductQuoteItem = {
  kind: "product";
  configurationHash: string;
  product: { id: string; slug: string; name: string };
  variant: { id: string; name: string };
  sizeMl: number;
  flavors: Array<{ id: string; name: string }>;
  addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
  totalPriceCents: number;
  quantity: number;
  note: string | null;
  lineTotalCents: number;
};

type ComboQuoteItem = {
  kind: "combo";
  configurationHash: string;
  combo: { id: string; slug: string; name: string; description: string | null };
  selections: Array<{
    configurationHash: string;
    product: { id: string; slug: string; name: string };
    variant: { id: string; name: string };
    sizeMl: number;
    flavors: Array<{ id: string; name: string }>;
    addons: Array<{ addonId: string; name: string; quantity: number; unitPriceCents: number }>;
    totalPriceCents: number;
  }>;
  totalPriceCents: number;
  quantity: number;
  note: string | null;
  lineTotalCents: number;
};

export type OrderQuote = {
  items: Array<ProductQuoteItem | ComboQuoteItem>;
  fulfillment: {
    fulfillmentType: "pickup" | "delivery";
    deliveryFeeCents: number;
    minimumOrderCents: number;
    deliveryZone: { id: string; name: string } | null;
    pickupAddressText: string | null;
    pickupInstructions: string | null;
  };
  subtotalCents: number;
  deliveryFeeCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  address: LilyAddressInput | null;
};

export type LilyRouteEstimate = {
  provider: string;
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt: string;
  estimatedArrivalAt: string | null;
  isLive: false;
};

export type LilyOrder = {
  id: string;
  orderNumber: string;
  fulfillmentType: "pickup" | "delivery";
  status: string;
  operationStatus: string;
  operationUpdatedAt: string;
  deliveryStatus: string;
  deliveryUpdatedAt: string | null;
  routeEstimate: LilyRouteEstimate | null;
  deliveryCode?: string;
  isHomologation: boolean;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
  address: LilyAddressInput | null;
  customerNote: string | null;
  whatsappUpdatesOptIn: boolean;
  createdAt: string;
  guestAccessToken?: string;
  items: Array<{
    id: string;
    kind: "product" | "combo";
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    sizeMl: number;
    configurationHash: string;
    configuration: Record<string, unknown>;
    flavors: Array<{ id: string; name: string }>;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    note: string | null;
    addons: Array<{ addonId: string; name: string; unitPriceCents: number; quantity: number }>;
  }>;
  statusEvents: Array<{ fromStatus: string | null; toStatus: string; actor: string; createdAt: string }>;
  operationEvents: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
  deliveryEvents: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type LilyGuestTrackingOrder = {
  id: string;
  orderNumber: string;
  fulfillmentType: "pickup" | "delivery";
  status: string;
  operationStatus: string;
  operationUpdatedAt: string;
  deliveryStatus: string;
  deliveryUpdatedAt: string | null;
  routeEstimate: LilyRouteEstimate | null;
  deliveryCode?: string;
  isHomologation: boolean;
  grandTotalCents: number;
  whatsappUpdatesOptIn: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    kind: "product" | "combo";
    productName: string;
    variantName: string;
    sizeMl: number;
    quantity: number;
    lineTotalCents: number;
    flavors: Array<{ name: string }>;
    addons: Array<{ name: string; quantity: number }>;
  }>;
  statusEvents: Array<{ toStatus: string; createdAt: string }>;
  operationEvents: Array<{ toStatus: string; createdAt: string }>;
  deliveryEvents: Array<{ toStatus: string; createdAt: string }>;
};

function selectionPayload(selection: NonNullable<CartItem["comboSelections"]>[number]) {
  return {
    productId: selection.productId,
    sizeMl: selection.sizeMl,
    flavorIds: selection.flavorIds,
    addons: selection.addons.map(({ addonId, quantity }) => ({ addonId, quantity }))
  };
}

function cartItemPayload(item: CartItem) {
  if (item.kind === "combo") {
    if (!item.comboId || !item.comboSelections?.length) throw new Error("Combo incompleto no carrinho.");
    return {
      kind: "combo" as const,
      comboId: item.comboId,
      selections: item.comboSelections.map(selectionPayload),
      quantity: item.quantity,
      note: item.note || null
    };
  }
  return {
    kind: "product" as const,
    productId: item.productId,
    sizeMl: item.sizeMl,
    flavorIds: item.flavorIds,
    addons: item.addons.map(({ addonId, quantity }) => ({ addonId, quantity })),
    quantity: item.quantity,
    note: item.note || null
  };
}

export async function getFulfillmentSettings() {
  const response = await fetch("/api/v1/lily/public/fulfillment", { credentials: "same-origin" });
  return parseResponse<FulfillmentSettings>(response);
}

export async function quoteOrder(input: {
  fulfillmentType: "pickup" | "delivery";
  address?: LilyAddressInput;
  items: CartItem[];
  homologation?: boolean;
}) {
  const response = await fetch("/api/v1/lily/orders/quote", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(input.homologation ? { "X-Lily-Homologation": "1" } : {})
    },
    body: JSON.stringify({
      fulfillmentType: input.fulfillmentType,
      ...(input.address ? { address: input.address } : {}),
      items: input.items.map(cartItemPayload)
    })
  });
  return parseResponse<OrderQuote>(response);
}

export async function createOrder(input: {
  phone: string;
  fulfillmentType: "pickup" | "delivery";
  address?: LilyAddressInput;
  customerNote?: string;
  whatsappUpdatesOptIn?: boolean;
  items: CartItem[];
  quote: OrderQuote;
  attribution?: Record<string, string>;
  session?: AuthPayload | null;
  idempotencyKey: string;
  homologation?: boolean;
}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": input.idempotencyKey,
    ...(input.homologation ? { "X-Lily-Homologation": "1" } : {})
  };
  if (input.session) headers["X-Lily-CSRF"] = input.session.csrfToken;

  const response = await fetch("/api/v1/lily/orders", {
    method: "POST",
    credentials: "same-origin",
    headers,
    body: JSON.stringify({
      phone: input.phone,
      fulfillmentType: input.fulfillmentType,
      ...(input.address ? { address: input.address } : {}),
      customerNote: input.customerNote || null,
      whatsappUpdatesOptIn: Boolean(input.whatsappUpdatesOptIn),
      items: input.items.map((item, index) => ({
        ...cartItemPayload(item),
        configurationHash: input.quote.items[index]!.configurationHash,
        expectedUnitPriceCents: input.quote.items[index]!.totalPriceCents
      })),
      attribution: input.attribution ?? {}
    })
  });
  return parseResponse<LilyOrder>(response);
}

export async function getSavedAddresses() {
  const response = await fetch("/api/v1/lily/customer/addresses", { credentials: "same-origin" });
  return parseResponse<{ addresses: Array<LilyAddressInput & { id: string; isDefault: boolean }> }>(response);
}

export async function createSavedAddress(address: LilyAddressInput, csrfToken: string, isDefault = false) {
  const response = await fetch("/api/v1/lily/customer/addresses", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify({ ...address, isDefault })
  });
  return parseResponse<LilyAddressInput & { id: string; isDefault: boolean }>(response);
}

export async function getCustomerOrders() {
  const response = await fetch("/api/v1/lily/customer/orders", { credentials: "same-origin" });
  return parseResponse<{ orders: LilyOrder[] }>(response);
}

export async function getCustomerOrder(id: string) {
  const response = await fetch(`/api/v1/lily/customer/orders/${encodeURIComponent(id)}`, { credentials: "same-origin" });
  return parseResponse<LilyOrder>(response);
}


export async function getGuestOrderTracking(orderId: string, guestAccessToken: string) {
  const response = await fetch(
    `/api/v1/lily/public/orders/${encodeURIComponent(orderId)}/tracking`,
    {
      credentials: "same-origin",
      headers: { "X-Lily-Order-Token": guestAccessToken },
      cache: "no-store"
    }
  );
  return parseResponse<LilyGuestTrackingOrder>(response);
}


export async function optOutOrderWhatsApp(
  orderId: string,
  options: { csrfToken?: string; guestAccessToken?: string } = {}
) {
  const headers: Record<string, string> = {};
  if (options.csrfToken) headers["X-Lily-CSRF"] = options.csrfToken;
  if (options.guestAccessToken) headers["X-Lily-Order-Token"] = options.guestAccessToken;

  const response = await fetch(
    `/api/v1/lily/orders/${encodeURIComponent(orderId)}/whatsapp/opt-out`,
    {
      method: "POST",
      credentials: "same-origin",
      headers
    }
  );
  return parseResponse<{ enabled: false }>(response);
}
