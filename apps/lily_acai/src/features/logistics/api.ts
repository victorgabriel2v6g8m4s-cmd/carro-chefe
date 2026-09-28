import { parseResponse } from "../../api";

export type CourierDeliveryStatus =
  | "not_ready"
  | "waiting_courier"
  | "courier_accepted"
  | "courier_arrived_pickup"
  | "picked_up"
  | "left_pickup"
  | "courier_arrived_delivery"
  | "delivered"
  | "left_delivery"
  | "cancelled";

export type CourierDestination = {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  reference?: string | null;
};

export type CourierDelivery = {
  id: string;
  orderNumber: string;
  financialStatus: string;
  operationStatus: string;
  deliveryStatus: CourierDeliveryStatus;
  deliveryUpdatedAt: string | null;
  courierUserId: string | null;
  assignedToMe: boolean;
  isHomologation: boolean;
  itemCount: number;
  createdAt: string;
  destination: CourierDestination | null;
  deliveryEvents: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type CourierDeliveriesPayload = {
  pickupAddressText: string | null;
  logisticsCodesReady: boolean;
  available: CourierDelivery[];
  mine: CourierDelivery[];
};

export type CourierDeliveryAction =
  | "arrived_pickup"
  | "confirm_pickup"
  | "left_pickup"
  | "arrived_delivery"
  | "confirm_delivery"
  | "left_delivery";

export async function getCourierDeliveries(includeFinished = false) {
  const query = includeFinished ? "?includeFinished=true" : "";
  const response = await fetch(`/api/v1/lily/courier/deliveries${query}`, {
    credentials: "same-origin"
  });
  return parseResponse<CourierDeliveriesPayload>(response);
}

export async function acceptCourierDelivery(orderId: string, csrfToken: string) {
  const response = await fetch(
    `/api/v1/lily/courier/deliveries/${encodeURIComponent(orderId)}/accept`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-Lily-CSRF": csrfToken }
    }
  );
  return parseResponse<CourierDelivery>(response);
}

export async function transitionCourierDelivery(
  orderId: string,
  input: { action: CourierDeliveryAction; code?: string; note?: string | null },
  csrfToken: string
) {
  const response = await fetch(
    `/api/v1/lily/courier/deliveries/${encodeURIComponent(orderId)}/transition`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Lily-CSRF": csrfToken
      },
      body: JSON.stringify(input)
    }
  );
  return parseResponse<CourierDelivery>(response);
}
