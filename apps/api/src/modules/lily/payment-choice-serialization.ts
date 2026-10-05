export function lilyPaymentChoiceInclude() {
  return { order: true, events: { orderBy: { createdAt: "asc" as const } } };
}

function parseStoredData(raw: string | null | undefined) {
  if (!raw) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

export function serializeLilyChoicePayment(payment: any) {
  const providerData = parseStoredData(payment.providerDataJson);
  const orchestration = providerData.orchestration && typeof providerData.orchestration === "object"
    ? providerData.orchestration
    : null;
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber ?? null,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    instructions: payment.instructionsSnapshot,
    providerData: {
      ticketUrl: typeof providerData.ticketUrl === "string" ? providerData.ticketUrl : null,
      qrCode: typeof providerData.qrCode === "string" ? providerData.qrCode : null,
      qrCodeBase64: typeof providerData.qrCodeBase64 === "string" ? providerData.qrCodeBase64 : null,
      paymentMethodId: typeof providerData.paymentMethodId === "string" ? providerData.paymentMethodId : null,
      paymentMethodType: typeof providerData.paymentMethodType === "string" ? providerData.paymentMethodType : null,
      installments: typeof providerData.installments === "number" ? providerData.installments : null
    },
    pricing: orchestration ? {
      baseAmountCents: Number(orchestration.baseAmountCents ?? payment.amountCents),
      eligibleAmountCents: Number(orchestration.eligibleAmountCents ?? payment.amountCents),
      deliveryFeeCents: Number(orchestration.deliveryFeeCents ?? 0),
      discountCents: Number(orchestration.discountCents ?? 0),
      amountCents: payment.amountCents,
      rule: orchestration.rule ?? null
    } : {
      baseAmountCents: payment.amountCents,
      eligibleAmountCents: payment.amountCents,
      deliveryFeeCents: 0,
      discountCents: 0,
      amountCents: payment.amountCents,
      rule: null
    },
    routing: orchestration ? {
      fallbackChain: Array.isArray(orchestration.fallbackChain) ? orchestration.fallbackChain : [payment.provider],
      actualProvider: payment.provider
    } : {
      fallbackChain: [payment.provider],
      actualProvider: payment.provider
    },
    expiresAt: payment.expiresAt,
    approvedAt: payment.approvedAt,
    failedAt: payment.failedAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

export function stringifyLilyPaymentProviderData(value: unknown) {
  return JSON.stringify(value);
}

export function safeLilyPaymentEventJson(value: unknown) {
  const text = JSON.stringify(value);
  return text.length <= 8000 ? text : JSON.stringify({ truncated: true });
}
