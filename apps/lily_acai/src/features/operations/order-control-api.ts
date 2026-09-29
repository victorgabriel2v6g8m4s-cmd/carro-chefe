import { parseResponse } from "../../api";

export type OrderFlowState = "active" | "completed" | "cancelled";

export type OrderAttentionFlag =
  | "paid_waiting_kitchen"
  | "preparation_overdue"
  | "operation_ahead_of_payment"
  | "delivery_queue_not_opened";

export type OrderControlRow = {
  id: string;
  orderNumber: string;
  financialStatus: string;
  operationStatus: string;
  operationUpdatedAt: string;
  deliveryStatus: string;
  deliveryUpdatedAt: string | null;
  fulfillmentType: "pickup" | "delivery";
  isHomologation: boolean;
  grandTotalCents: number;
  createdAt: string;
  completedAt: string | null;
  itemCount: number;
  flowState: OrderFlowState;
  attention: OrderAttentionFlag[];
  sla: {
    thresholdMinutes: number;
    startedAt: string;
    dueAt: string;
    elapsedMinutes: number;
    remainingMinutes: number;
    overdueMinutes: number;
    status: "on_track" | "overdue";
  } | null;
  nextAction: {
    kind: "payment" | "kitchen" | "pickup" | "delivery";
    label: string;
    path: string;
  } | null;
};

export type OrderControlPayload = {
  generatedAt: string;
  filters: {
    state: "active" | "attention" | "completed" | "cancelled" | "all";
    fulfillment?: "pickup" | "delivery";
    q?: string;
    limit: number;
  };
  summary: {
    visible: number;
    attention: number;
    awaitingPayment: number;
    preparing: number;
    ready: number;
    deliveryInProgress: number;
    completed: number;
  };
  orders: OrderControlRow[];
};

export async function getOrderControlOverview(input: {
  state?: "active" | "attention" | "completed" | "cancelled" | "all";
  fulfillment?: "pickup" | "delivery";
  q?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (input.state) params.set("state", input.state);
  if (input.fulfillment) params.set("fulfillment", input.fulfillment);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.limit) params.set("limit", String(input.limit));

  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/lily/admin/orders/overview${query}`, {
    credentials: "same-origin",
    cache: "no-store"
  });
  return parseResponse<OrderControlPayload>(response);
}

export async function completePickupOrder(orderId: string, csrfToken: string) {
  const response = await fetch(
    `/api/v1/lily/admin/orders/${encodeURIComponent(orderId)}/complete-pickup`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-Lily-CSRF": csrfToken }
    }
  );
  return parseResponse<OrderControlRow>(response);
}
