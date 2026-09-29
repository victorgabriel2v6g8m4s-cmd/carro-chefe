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

export type CourierRouteEstimate = {
  provider: string;
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt: string;
  estimatedArrivalAt: string | null;
  isLive: false;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  mapUrl?: string;
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
  routeEstimate: CourierRouteEstimate | null;
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

export async function getCourierDeliveryRoute(orderId: string) {
  const response = await fetch(
    `/api/v1/lily/courier/deliveries/${encodeURIComponent(orderId)}/route`,
    { credentials: "same-origin", cache: "no-store" }
  );
  return parseResponse<
    | { available: true; cached: boolean; estimate: CourierRouteEstimate }
    | { available: false; reason: "not_configured" | "address_incomplete" | "provider_unavailable"; provider: string }
  >(response);
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


export type DeliveryAssignmentStatus =
  | "active"
  | "completed"
  | "abandoned"
  | "reassigned"
  | "cancelled";

export type DeliveryAssignment = {
  id: string;
  courierUserId: string;
  status: DeliveryAssignmentStatus;
  assignedBy: string;
  assignedAt: string;
  endedAt: string | null;
  endReason: string | null;
};

export type CourierDeliveryHistoryPayload = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Array<{
    assignment: DeliveryAssignment;
    delivery: CourierDelivery;
  }>;
};

export type AdminCourierSummary = {
  id: string;
  displayName: string | null;
  role: string;
  status?: string;
};

export type AdminDeliveriesPayload = {
  couriers: AdminCourierSummary[];
  deliveries: Array<CourierDelivery & {
    courier: AdminCourierSummary | null;
  }>;
};

export type AdminDeliveryHistoryPayload = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Array<{
    assignment: DeliveryAssignment;
    courier: AdminCourierSummary;
    delivery: CourierDelivery;
  }>;
};

export async function rejectCourierDelivery(
  orderId: string,
  input: {
    reason: "route_not_viable" | "capacity" | "vehicle" | "personal" | "other";
    note?: string | null;
  },
  csrfToken: string
) {
  const response = await fetch(
    `/api/v1/lily/courier/deliveries/${encodeURIComponent(orderId)}/reject`,
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
  return parseResponse<{ rejected: true }>(response);
}

export async function abandonCourierDelivery(
  orderId: string,
  input: {
    reason: "vehicle" | "incident" | "personal" | "other";
    note?: string | null;
  },
  csrfToken: string
) {
  const response = await fetch(
    `/api/v1/lily/courier/deliveries/${encodeURIComponent(orderId)}/abandon`,
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

export async function getCourierDeliveryHistory(input: {
  page?: number;
  limit?: number;
  status?: DeliveryAssignmentStatus;
} = {}) {
  const params = new URLSearchParams();
  if (input.page) params.set("page", String(input.page));
  if (input.limit) params.set("limit", String(input.limit));
  if (input.status) params.set("status", input.status);
  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/lily/courier/deliveries/history${query}`, {
    credentials: "same-origin"
  });
  return parseResponse<CourierDeliveryHistoryPayload>(response);
}

export async function getAdminDeliveries(status?: CourierDeliveryStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`/api/v1/lily/admin/deliveries${query}`, {
    credentials: "same-origin"
  });
  return parseResponse<AdminDeliveriesPayload>(response);
}

export async function reassignAdminDelivery(
  orderId: string,
  input: {
    courierUserId?: string | null;
    reason: "operational" | "courier_unavailable" | "support" | "other";
    note?: string | null;
  },
  csrfToken: string
) {
  const response = await fetch(
    `/api/v1/lily/admin/deliveries/${encodeURIComponent(orderId)}/reassign`,
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

export async function getAdminDeliveryHistory(input: {
  page?: number;
  limit?: number;
  status?: DeliveryAssignmentStatus;
  courierUserId?: string;
  from?: string;
  to?: string;
} = {}) {
  const params = new URLSearchParams();
  if (input.page) params.set("page", String(input.page));
  if (input.limit) params.set("limit", String(input.limit));
  if (input.status) params.set("status", input.status);
  if (input.courierUserId) params.set("courierUserId", input.courierUserId);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  const query = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/lily/admin/deliveries/history${query}`, {
    credentials: "same-origin"
  });
  return parseResponse<AdminDeliveryHistoryPayload>(response);
}
