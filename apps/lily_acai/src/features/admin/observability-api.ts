import { parseResponse } from "../../api";

export type LilyObservabilitySummary = {
  generatedAt: string;
  database: { status: "ok" };
  orders: {
    awaitingPayment: number;
    paidActive: number;
    preparing: number;
    readyForDispatch: number;
    waitingCourier: number;
    deliveryInProgress: number;
    latest: {
      createdAt: string;
      status: string;
      operationStatus: string;
      deliveryStatus: string;
      fulfillmentType: string;
      isHomologation: boolean;
    } | null;
  };
  whatsapp: {
    pending: number;
    failed: number;
    dead: number;
  };
  pixReconciliation: {
    reviewRequired: number;
    lastSuccessfulAt: string | null;
    lastAttemptAt: string | null;
    lastErrorCode: string | null;
    updatedAt: string | null;
  };
};

export async function getLilyObservabilitySummary() {
  const response = await fetch("/api/v1/lily/admin/observability/summary", {
    credentials: "same-origin",
    cache: "no-store"
  });
  return parseResponse<LilyObservabilitySummary>(response);
}
