import {
  cancelMercadoPagoPayment,
  createMercadoPagoPayment,
  getMercadoPagoPayment,
  refundMercadoPagoPayment
} from "./mercado-pago-provider";

export type LilyPaymentMethod = "manual_pix" | "pix" | "credit_card";

export type LilyPaymentPayer = {
  email: string;
  identification?: {
    type: string;
    number: string;
  };
};

export type LilyCardPaymentInput = {
  token: string;
  paymentMethodId: string;
  installments: number;
};

export type LilyPaymentProviderCreateInput = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: "BRL";
  method: LilyPaymentMethod;
  idempotencyKey: string;
  instructions?: string | null;
  payer?: LilyPaymentPayer;
  card?: LilyCardPaymentInput;
};

export type LilyPaymentProviderData = {
  ticketUrl: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  paymentMethodId: string | null;
  paymentMethodType: string | null;
  installments: number | null;
};

export type LilyPaymentProviderCreateResult = {
  providerPaymentId: string | null;
  providerReference: string | null;
  status: "pending" | "approved" | "failed";
  instructions: string | null;
  expiresAt: Date | null;
  providerData: LilyPaymentProviderData | null;
};

export type LilyPaymentProviderRemoteState = {
  status: "pending" | "approved" | "failed" | "cancelled" | "partially_refunded" | "refunded";
  providerPaymentId: string | null;
  providerReference: string | null;
  providerStatus: string;
  providerStatusDetail: string | null;
  paidCents: number | null;
  refundedCents: number;
  operationReference?: string | null;
  data: LilyPaymentProviderData;
};

export type LilyPaymentProviderRefundInput = {
  providerPaymentId: string | null;
  providerReference: string | null;
  amountCents: number;
  remainingCents: number;
  idempotencyKey: string;
};

export interface LilyPaymentProvider {
  readonly id: string;
  createPayment(input: LilyPaymentProviderCreateInput): Promise<LilyPaymentProviderCreateResult>;
  getPayment?(providerPaymentId: string): Promise<LilyPaymentProviderRemoteState>;
  cancelPayment?(providerPaymentId: string, idempotencyKey: string): Promise<LilyPaymentProviderRemoteState>;
  refundPayment?(input: LilyPaymentProviderRefundInput): Promise<LilyPaymentProviderRemoteState>;
}

class ManualPaymentProvider implements LilyPaymentProvider {
  readonly id = "manual";

  async createPayment(input: LilyPaymentProviderCreateInput): Promise<LilyPaymentProviderCreateResult> {
    return {
      providerPaymentId: null,
      providerReference: null,
      status: "pending",
      instructions: input.instructions ?? null,
      expiresAt: null,
      providerData: null
    };
  }
}

const manual = new ManualPaymentProvider();

const mercadoPago: LilyPaymentProvider = {
  id: "mercado_pago",
  createPayment: createMercadoPagoPayment,
  getPayment: getMercadoPagoPayment,
  cancelPayment: cancelMercadoPagoPayment,
  refundPayment: refundMercadoPagoPayment
};

export function lilyPaymentProvider(id: string): LilyPaymentProvider {
  if (id === "manual") return manual;
  if (id === "mercado_pago") return mercadoPago;
  throw new Error(`Provedor de pagamento não configurado/suportado: ${id}`);
}
