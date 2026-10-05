import { ApiError } from "../../lib/errors";
import { createCookLilyPixPayment, cookLilyPixConfiguration } from "./cooklily-pix-provider";
import { getLilyOperationalSettings } from "./fulfillment";
import { mercadoPagoConfiguration } from "./mercado-pago-provider";
import { createMercadoPagoChoicePayment } from "./mercado-pago-choice-provider";
import {
  calculateLilyPaymentQuote,
  getLilyPaymentMethodSettings,
  type LilyCheckoutPaymentMethod,
  type LilyPaymentMethodSetting,
  type LilyPaymentQuote
} from "./payment-method-rules";

export type LilyChoiceProviderId = "cooklily_pix" | "mercado_pago" | "manual";

export type LilyChoiceProviderResult = {
  providerPaymentId: string | null;
  providerReference: string | null;
  status: "pending" | "approved" | "failed";
  paidCents: number | null;
  instructions: string | null;
  expiresAt: Date | null;
  providerData: Record<string, unknown> | null;
};

export type LilyChoicePixInput = {
  payer?: {
    email: string;
    identification?: { type: string; number: string };
  };
};

export function lilyPixProviderChain(
  settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>
): LilyChoiceProviderId[] {
  const cookLily = cookLilyPixConfiguration();
  const mercadoPago = mercadoPagoConfiguration();
  const providers: LilyChoiceProviderId[] = [];
  if (cookLily.ready) providers.push("cooklily_pix");
  if (settings.mercadoPagoPixEnabled && mercadoPago.pixReady) providers.push("mercado_pago");
  if (settings.manualPixEnabled && settings.manualPixInstructions?.trim()) providers.push("manual");
  return providers;
}

export function lilyPaymentMethodAvailability(
  settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>,
  rule: LilyPaymentMethodSetting
) {
  const mercadoPago = mercadoPagoConfiguration();
  if (!rule.enabled) return { available: false, providers: [] as LilyChoiceProviderId[] };
  if (rule.method === "pix") {
    const providers = lilyPixProviderChain(settings);
    return { available: providers.length > 0, providers };
  }
  const available = settings.mercadoPagoCardEnabled && mercadoPago.cardReady;
  return { available, providers: available ? ["mercado_pago" as const] : [] };
}

export function lilyPaymentMethodLabel(method: LilyCheckoutPaymentMethod) {
  return method === "pix" ? "Pix"
    : method === "credit_card" ? "Cartão de crédito"
    : "Cartão de débito";
}

export function lilyPaymentDiscountLabel(rule: LilyPaymentMethodSetting) {
  if (rule.discountType === "percentage" && rule.discountValue > 0) {
    const percentage = rule.discountValue / 100;
    return `${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de desconto`;
  }
  if (rule.discountType === "fixed" && rule.discountValue > 0) {
    return `R$ ${(rule.discountValue / 100).toFixed(2).replace(".", ",")} de desconto`;
  }
  return null;
}

export async function buildLilyPaymentMethodOptions(order: {
  grandTotalCents: number;
  deliveryFeeCents: number;
}) {
  const settings = await getLilyOperationalSettings();
  const rules = await getLilyPaymentMethodSettings();
  return rules.map((rule) => {
    const availability = lilyPaymentMethodAvailability(settings, rule);
    const quote = calculateLilyPaymentQuote({
      method: rule.method,
      grandTotalCents: order.grandTotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      setting: rule
    });
    return {
      id: rule.method,
      label: lilyPaymentMethodLabel(rule.method),
      available: availability.available,
      providers: availability.providers,
      preferredProvider: availability.providers[0] ?? null,
      requiresPayerEmail: rule.method !== "pix" || availability.providers.includes("mercado_pago"),
      fallbackMayUsePayerEmail: rule.method === "pix" && availability.providers.includes("mercado_pago"),
      discountLabel: lilyPaymentDiscountLabel(rule),
      pricing: quote
    };
  });
}

export async function createLilyPixChoice(input: {
  paymentId: string;
  order: { id: string; orderNumber: string };
  request: LilyChoicePixInput;
  quote: LilyPaymentQuote;
  idempotencyKey: string;
  chain: LilyChoiceProviderId[];
}): Promise<{
  provider: LilyChoiceProviderId;
  result: LilyChoiceProviderResult;
  attemptedProviders: LilyChoiceProviderId[];
}> {
  const attemptedProviders: LilyChoiceProviderId[] = [];
  let lastLocalError: unknown = null;

  for (const provider of input.chain) {
    attemptedProviders.push(provider);
    if (provider === "cooklily_pix") {
      try {
        const result = await createCookLilyPixPayment({
          paymentId: input.paymentId,
          orderId: input.order.id,
          orderNumber: input.order.orderNumber,
          amountCents: input.quote.amountCents,
          currency: "BRL",
          method: "pix",
          idempotencyKey: input.idempotencyKey,
          ...(input.request.payer ? { payer: input.request.payer } : {})
        });
        if (result.status !== "failed") {
          return { provider, result: result as LilyChoiceProviderResult, attemptedProviders };
        }
        lastLocalError = new Error("Pix CookLily não pôde ser gerado.");
      } catch (error) {
        // Geração de BR Code é local e não cria cobrança externa; fallback é seguro.
        lastLocalError = error;
      }
      continue;
    }

    if (provider === "mercado_pago") {
      if (!input.request.payer?.email) {
        lastLocalError = new ApiError(400, "Informe um e-mail para usar o fallback Pix do Mercado Pago.", {
          code: "LILY_PIX_FALLBACK_EMAIL_REQUIRED"
        });
        continue;
      }
      const result = await createMercadoPagoChoicePayment({
        paymentId: input.paymentId,
        orderId: input.order.id,
        amountCents: input.quote.amountCents,
        method: "pix",
        idempotencyKey: input.idempotencyKey,
        payer: input.request.payer
      });
      // A partir daqui o provider externo pode ter criado cobrança. Nunca cair
      // silenciosamente para outro provider em caso de timeout/estado ambíguo.
      return { provider, result: result as LilyChoiceProviderResult, attemptedProviders };
    }

    return {
      provider: "manual",
      result: {
        providerPaymentId: null,
        providerReference: null,
        status: "pending",
        paidCents: null,
        instructions: (await getLilyOperationalSettings()).manualPixInstructions?.trim() ?? null,
        expiresAt: null,
        providerData: null
      },
      attemptedProviders
    };
  }

  if (lastLocalError instanceof ApiError) throw lastLocalError;
  throw new ApiError(503, "Nenhuma rota Pix está disponível no momento.", {
    code: "LILY_PIX_ROUTE_UNAVAILABLE"
  });
}

export async function createLilyCardChoice(input: {
  paymentId: string;
  orderId: string;
  amountCents: number;
  method: Extract<LilyCheckoutPaymentMethod, "credit_card" | "debit_card">;
  idempotencyKey: string;
  payer: { email: string; identification?: { type: string; number: string } };
  card: { token: string; paymentMethodId: string; installments: number };
}) {
  const result = await createMercadoPagoChoicePayment({
    paymentId: input.paymentId,
    orderId: input.orderId,
    amountCents: input.amountCents,
    method: input.method,
    idempotencyKey: input.idempotencyKey,
    payer: input.payer,
    card: {
      ...input.card,
      installments: input.method === "debit_card" ? 1 : input.card.installments
    }
  });
  return {
    provider: "mercado_pago" as const,
    result: result as LilyChoiceProviderResult,
    attemptedProviders: ["mercado_pago" as const]
  };
}
