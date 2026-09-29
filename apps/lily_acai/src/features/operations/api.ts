import { parseResponse } from "../../api";

export type KitchenOperationStatus =
  | "received"
  | "waiting_payment"
  | "preparing"
  | "ready_for_dispatch"
  | "completed"
  | "cancelled";

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  financialStatus: string;
  operationStatus: KitchenOperationStatus;
  operationUpdatedAt: string;
  deliveryStatus: string;
  deliveryUpdatedAt: string | null;
  fulfillmentType: "pickup" | "delivery";
  isHomologation: boolean;
  grandTotalCents: number;
  customerNote: string | null;
  pickupCode: string | null;
  createdAt: string;
  sla: {
    thresholdMinutes: number;
    startedAt: string;
    dueAt: string;
    elapsedMinutes: number;
    remainingMinutes: number;
    overdueMinutes: number;
    status: "on_track" | "overdue";
  } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    sizeMl: number;
    quantity: number;
    note: string | null;
    flavors: Array<{ id?: string; name?: string }>;
    configuration: Record<string, unknown>;
    addons: Array<{ name: string; quantity: number }>;
  }>;
  operationEvents: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
};

export async function getKitchenOrders() {
  const response = await fetch("/api/v1/lily/admin/kitchen/orders", {
    credentials: "same-origin"
  });
  return parseResponse<{
    orders: KitchenOrder[];
    statuses: KitchenOperationStatus[];
    sla: {
      kitchenPreparationSlaMinutes: number | null;
      overdue: number;
    };
  }>(response);
}

export async function advanceKitchenOrder(
  id: string,
  csrfToken: string,
  note?: string | null
) {
  const response = await fetch(
    `/api/v1/lily/admin/kitchen/orders/${encodeURIComponent(id)}/advance`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Lily-CSRF": csrfToken
      },
      body: JSON.stringify({ note: note || null })
    }
  );
  return parseResponse<KitchenOrder>(response);
}


export type KitchenPrintTicket = {
  id: string;
  orderNumber: string;
  createdAt: string;
  fulfillmentType: "pickup" | "delivery";
  isHomologation: boolean;
  customerNote: string | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    sizeMl: number;
    quantity: number;
    note: string | null;
    flavors: Array<{ name: string }>;
    addons: Array<{ name: string; quantity: number }>;
  }>;
};

export async function getKitchenPrintTicket(id: string) {
  const response = await fetch(
    `/api/v1/lily/admin/kitchen/orders/${encodeURIComponent(id)}/print`,
    { credentials: "same-origin" }
  );
  return parseResponse<{ ticket: KitchenPrintTicket }>(response);
}
