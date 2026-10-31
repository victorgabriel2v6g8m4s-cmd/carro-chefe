import { parseResponse } from "../../api";

export type ReviewDimension = { rating: number; comment: string };
export type OrderReview = {
  submittedAt: string;
  store: ReviewDimension | null;
  delivery: ReviewDimension | null;
  platform: ReviewDimension | null;
};

export async function getOrderReview(orderId: string) {
  const response = await fetch(`/api/v1/lily/customer/orders/${encodeURIComponent(orderId)}/review`, {
    credentials: "same-origin"
  });
  return parseResponse<{ eligible: boolean; fulfillmentType: "pickup" | "delivery"; review: OrderReview | null }>(response);
}

export async function submitOrderReview(orderId: string, csrfToken: string, input: {
  store?: ReviewDimension;
  delivery?: ReviewDimension;
  platform?: ReviewDimension;
}) {
  const response = await fetch(`/api/v1/lily/customer/orders/${encodeURIComponent(orderId)}/review`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<{ review: OrderReview }>(response);
}
