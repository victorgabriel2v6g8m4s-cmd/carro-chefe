import { describe, expect, it } from "vitest";
import { customerOrderStatus } from "./status";

describe("customerOrderStatus", () => {
  it("prioriza cancelamento operacional sobre uma entrega ainda marcada como ativa", () => {
    expect(customerOrderStatus({
      status: "paid",
      operationStatus: "cancelled",
      deliveryStatus: "waiting_courier",
      fulfillmentType: "delivery"
    })).toBe("cancelled");
  });

  it("prioriza cancelamento da entrega sobre o estado operacional anterior", () => {
    expect(customerOrderStatus({
      status: "paid",
      operationStatus: "ready_for_dispatch",
      deliveryStatus: "cancelled",
      fulfillmentType: "delivery"
    })).toBe("cancelled");
  });

  it("preserva o estado financeiro de estorno como estado terminal", () => {
    expect(customerOrderStatus({
      status: "refunded",
      operationStatus: "cancelled",
      deliveryStatus: "cancelled",
      fulfillmentType: "delivery"
    })).toBe("refunded");
  });

  it("mantém o estado de entrega para um pedido de entrega não cancelado", () => {
    expect(customerOrderStatus({
      status: "paid",
      operationStatus: "ready_for_dispatch",
      deliveryStatus: "left_pickup",
      fulfillmentType: "delivery"
    })).toBe("left_pickup");
  });
});
