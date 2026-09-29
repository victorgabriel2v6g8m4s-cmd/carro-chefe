import { describe, expect, it } from "vitest";
import { lilyKitchenPreparationSla } from "./operational-sla";

describe("CookLily Entrega 11J — SLA operacional", () => {
  it("fica desabilitado sem threshold configurado", () => {
    expect(lilyKitchenPreparationSla({
      operationStatus: "preparing",
      operationUpdatedAt: new Date("2026-09-29T20:00:00.000Z")
    }, null, new Date("2026-09-29T20:30:00.000Z"))).toBeNull();
  });

  it("não calcula SLA fora da etapa preparing", () => {
    expect(lilyKitchenPreparationSla({
      operationStatus: "ready_for_dispatch",
      operationUpdatedAt: new Date("2026-09-29T20:00:00.000Z")
    }, 20, new Date("2026-09-29T21:00:00.000Z"))).toBeNull();
  });

  it("calcula prazo restante usando o relógio do servidor", () => {
    expect(lilyKitchenPreparationSla({
      operationStatus: "preparing",
      operationUpdatedAt: new Date("2026-09-29T20:00:00.000Z")
    }, 20, new Date("2026-09-29T20:07:30.000Z"))).toMatchObject({
      thresholdMinutes: 20,
      elapsedMinutes: 7,
      remainingMinutes: 13,
      overdueMinutes: 0,
      status: "on_track"
    });
  });

  it("marca atraso sem alterar qualquer estado do pedido", () => {
    const result = lilyKitchenPreparationSla({
      operationStatus: "preparing",
      operationUpdatedAt: new Date("2026-09-29T20:00:00.000Z")
    }, 20, new Date("2026-09-29T20:25:01.000Z"));

    expect(result).toMatchObject({
      thresholdMinutes: 20,
      elapsedMinutes: 25,
      remainingMinutes: 0,
      overdueMinutes: 6,
      status: "overdue"
    });
    expect(result?.dueAt).toEqual(new Date("2026-09-29T20:20:00.000Z"));
  });
});
