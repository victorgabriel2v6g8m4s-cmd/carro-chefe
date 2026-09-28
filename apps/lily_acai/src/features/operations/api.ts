import { parseResponse } from "../../api";

export type KitchenOperationStatus =
  | "received"
  | "waiting_payment"
  | "preparing"
  | "ready_for_dispatch"
  | "cancelled";

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  financialStatus: string;
  operationStatus: KitchenOperationStatus;
  operationUpdatedAt: string;
  fulfillmentType: "pickup" | "delivery";
  isHomologation: boolean;
  grandTotalCents: number;
  customerNote: string | null;
  createdAt: string;
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
