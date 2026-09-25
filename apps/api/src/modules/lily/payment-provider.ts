export type LilyPaymentProviderCreateInput = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: "BRL";
  method: "manual_pix";
  instructions: string;
};

export type LilyPaymentProviderCreateResult = {
  providerPaymentId: string | null;
  status: "pending" | "approved" | "failed";
  instructions: string | null;
  expiresAt: Date | null;
};

export interface LilyPaymentProvider {
  readonly id: string;
  createPayment(input: LilyPaymentProviderCreateInput): Promise<LilyPaymentProviderCreateResult>;
}

class ManualPaymentProvider implements LilyPaymentProvider {
  readonly id = "manual";

  async createPayment(input: LilyPaymentProviderCreateInput): Promise<LilyPaymentProviderCreateResult> {
    return {
      providerPaymentId: null,
      status: "pending",
      instructions: input.instructions,
      expiresAt: null
    };
  }
}

const manual = new ManualPaymentProvider();

export function lilyPaymentProvider(id: string): LilyPaymentProvider {
  if (id === "manual") return manual;
  throw new Error(`Provedor de pagamento não configurado/suportado: ${id}`);
}
