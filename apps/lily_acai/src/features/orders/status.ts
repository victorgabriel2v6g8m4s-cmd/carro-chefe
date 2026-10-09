export type CustomerOrderStatusInput = {
  status: string;
  operationStatus: string;
  deliveryStatus: string;
  fulfillmentType: "pickup" | "delivery";
};

/**
 * Resolve the customer-facing status with terminal states taking precedence
 * over stale operational or delivery states.
 */
export function customerOrderStatus(order: CustomerOrderStatusInput) {
  if (order.status === "refunded" || order.status === "cancelled") {
    return order.status;
  }

  if (order.operationStatus === "cancelled" || order.deliveryStatus === "cancelled") {
    return "cancelled";
  }

  if (order.status === "awaiting_payment") return order.status;

  if (order.fulfillmentType === "delivery"
    && !["not_ready", "not_applicable"].includes(order.deliveryStatus)) {
    return order.deliveryStatus;
  }

  if (order.fulfillmentType === "pickup" && order.operationStatus === "ready_for_dispatch") {
    return "ready_for_pickup";
  }

  if (order.operationStatus && order.operationStatus !== "received") {
    return order.operationStatus;
  }

  return order.status === "paid" ? "paid" : order.operationStatus || order.status;
}
