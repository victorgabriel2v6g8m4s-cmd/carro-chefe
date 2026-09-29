import crypto from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lilyPrisma } from "@lily-acai/database";
import {
  lilyPixAutoReconciliationConfiguration,
  parsePixApiV2Received,
  reconcileReceivedPix
} from "./pix-reconciliation";

const createdOrderIds: string[] = [];

async function cleanup() {
  await lilyPrisma.lilyPixSettlement.deleteMany();
  await lilyPrisma.lilyPaymentReconciliation.deleteMany();
  await lilyPrisma.lilyPaymentEvent.deleteMany();
  await lilyPrisma.lilyPayment.deleteMany();
  await lilyPrisma.lilyWhatsAppNotification.deleteMany();
  await lilyPrisma.lilyOrderStatusEvent.deleteMany();
  await lilyPrisma.lilyOrder.deleteMany({
    where: createdOrderIds.length ? { id: { in: createdOrderIds } } : undefined
  });
  createdOrderIds.length = 0;
}

async function createPendingCookLilyPix(input: {
  amountCents?: number;
  txid?: string;
  whatsappUpdatesOptIn?: boolean;
} = {}) {
  const suffix = crypto.randomBytes(5).toString("hex");
  const txid = input.txid ?? `CL${crypto.randomBytes(11).toString("hex").slice(0, 23)}`;
  const amountCents = input.amountCents ?? 2500;
  const order = await lilyPrisma.lilyOrder.create({
    data: {
      orderNumber: `PIXREC-${suffix.toUpperCase()}`,
      idempotencyKey: `pix-rec-order-${suffix}`,
      requestFingerprint: `pix-rec-fingerprint-${suffix}`,
      phoneNormalized: "+5567999919191",
      fulfillmentType: "pickup",
      status: "awaiting_payment",
      operationStatus: "received",
      deliveryStatus: "not_applicable",
      subtotalCents: amountCents,
      deliveryFeeCents: 0,
      discountTotalCents: 0,
      grandTotalCents: amountCents,
      whatsappUpdatesOptIn: Boolean(input.whatsappUpdatesOptIn),
      whatsappConsentAt: input.whatsappUpdatesOptIn ? new Date() : null,
      whatsappConsentVersion: input.whatsappUpdatesOptIn ? "2026-09-29" : null
    }
  });
  createdOrderIds.push(order.id);
  const payment = await lilyPrisma.lilyPayment.create({
    data: {
      orderId: order.id,
      idempotencyKey: `pix-rec-payment-${suffix}`,
      provider: "cooklily_pix",
      method: "pix",
      status: "pending",
      amountCents,
      currency: "BRL",
      providerPaymentId: txid,
      providerReference: txid
    }
  });
  return { order, payment, txid };
}

function received(input: {
  endToEndId?: string;
  txid?: string | null;
  amountCents?: number;
  occurredAt?: Date;
}) {
  const endToEndId = input.endToEndId ?? "E12345678202609291730ABCDEF123456";
  const amountCents = input.amountCents ?? 2500;
  const occurredAt = input.occurredAt ?? new Date("2026-09-29T17:30:00.000Z");
  const canonical = JSON.stringify({
    endToEndId,
    txid: input.txid ?? null,
    amountCents,
    occurredAt: occurredAt.toISOString()
  });
  return {
    endToEndId,
    txid: input.txid ?? null,
    amountCents,
    occurredAt,
    payloadHash: crypto.createHash("sha256").update(canonical).digest("hex")
  };
}

beforeEach(async () => {
  delete process.env.COOKLILY_PIX_RECONCILIATION_PROVIDER;
  delete process.env.COOKLILY_PIX_API_BASE_URL;
  delete process.env.COOKLILY_PIX_API_OAUTH_URL;
  delete process.env.COOKLILY_PIX_API_CLIENT_ID;
  delete process.env.COOKLILY_PIX_API_CLIENT_SECRET;
  delete process.env.COOKLILY_PIX_API_PFX_PATH;
  await cleanup();
});

afterAll(cleanup);

describe("CookLily Entrega 11I — conciliação automática Pix", () => {
  it("permanece desabilitada sem credenciais bancárias completas", () => {
    expect(lilyPixAutoReconciliationConfiguration()).toMatchObject({
      provider: "disabled",
      ready: false,
      clientIdConfigured: false,
      clientSecretConfigured: false,
      pfxConfigured: false
    });
  });

  it("normaliza somente campos financeiros necessários do payload Pix API v2", () => {
    const parsed = parsePixApiV2Received({
      parametros: { paginacao: { paginaAtual: 0, quantidadeDePaginas: 1 } },
      pix: [{
        endToEndId: "E12345678202609291730ABCDEF123456",
        txid: "CL12345678901234567890123",
        valor: "25.00",
        horario: "2026-09-29T17:30:00.000Z",
        pagador: {
          nome: "Dado que não deve ser persistido",
          cpf: "12345678900"
        },
        infoPagador: "texto livre"
      }]
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      endToEndId: "E12345678202609291730ABCDEF123456",
      txid: "CL12345678901234567890123",
      amountCents: 2500,
      occurredAt: new Date("2026-09-29T17:30:00.000Z")
    });
    expect(JSON.stringify(parsed[0])).not.toContain("Dado que não deve ser persistido");
    expect(JSON.stringify(parsed[0])).not.toContain("12345678900");
    expect(parsed[0]?.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("aprova exatamente uma vez quando txid e valor correspondem", async () => {
    const { order, payment, txid } = await createPendingCookLilyPix({
      whatsappUpdatesOptIn: true
    });
    const event = received({ txid });

    const settlement = await reconcileReceivedPix(event);
    expect(settlement.matchStatus).toBe("matched");
    expect(settlement.paymentId).toBe(payment.id);
    expect(settlement.matchedAt).not.toBeNull();

    const [storedPayment, storedOrder, reconciliation, notifications] = await Promise.all([
      lilyPrisma.lilyPayment.findUnique({ where: { id: payment.id } }),
      lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } }),
      lilyPrisma.lilyPaymentReconciliation.findMany({ where: { paymentId: payment.id } }),
      lilyPrisma.lilyWhatsAppNotification.findMany({ where: { orderId: order.id } })
    ]);

    expect(storedPayment?.status).toBe("approved");
    expect(storedPayment?.approvedAt).not.toBeNull();
    expect(storedOrder?.status).toBe("paid");
    expect(storedOrder?.paidAt).toEqual(event.occurredAt);
    expect(reconciliation).toHaveLength(1);
    expect(reconciliation[0]).toMatchObject({
      status: "matched",
      expectedGrossCents: 2500,
      reportedGrossCents: 2500,
      discrepancyCents: 0,
      reconciledBy: "provider:pix_api_v2"
    });
    expect(notifications.map((row) => row.stage)).toEqual(["payment_confirmed"]);

    const replay = await reconcileReceivedPix(event);
    expect(replay.id).toBe(settlement.id);
    expect(await lilyPrisma.lilyPaymentEvent.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await lilyPrisma.lilyPaymentReconciliation.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await lilyPrisma.lilyPixSettlement.count()).toBe(1);
  });

  it("não aprova quando o valor recebido diverge", async () => {
    const { order, payment, txid } = await createPendingCookLilyPix({ amountCents: 2500 });
    const settlement = await reconcileReceivedPix(received({
      txid,
      amountCents: 2400
    }));

    expect(settlement.matchStatus).toBe("discrepant");
    expect((await lilyPrisma.lilyPayment.findUnique({ where: { id: payment.id } }))?.status).toBe("pending");
    expect((await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } }))?.status).toBe("awaiting_payment");

    const reconciliation = await lilyPrisma.lilyPaymentReconciliation.findFirst({
      where: { paymentId: payment.id }
    });
    expect(reconciliation).toMatchObject({
      status: "discrepant",
      expectedGrossCents: 2500,
      reportedGrossCents: 2400,
      discrepancyCents: -100
    });
  });

  it("registra txid desconhecido e Pix sem txid sem tocar em pedidos", async () => {
    const unknown = await reconcileReceivedPix(received({
      txid: "CL99999999999999999999999"
    }));
    expect(unknown.matchStatus).toBe("unmatched");
    expect(unknown.paymentId).toBeNull();

    const noTxid = await reconcileReceivedPix(received({
      endToEndId: "E12345678202609291730ABCDEF999999",
      txid: null
    }));
    expect(noTxid.matchStatus).toBe("no_txid");
    expect(noTxid.paymentId).toBeNull();
  });

  it("um segundo Pix no mesmo txid após aprovação é alerta de duplicidade e não nova aprovação", async () => {
    const { order, payment, txid } = await createPendingCookLilyPix();
    const first = received({
      endToEndId: "E12345678202609291730ABCDEF111111",
      txid
    });
    const second = received({
      endToEndId: "E12345678202609291730ABCDEF222222",
      txid,
      occurredAt: new Date("2026-09-29T17:31:00.000Z")
    });

    expect((await reconcileReceivedPix(first)).matchStatus).toBe("matched");
    expect((await reconcileReceivedPix(second)).matchStatus).toBe("duplicate_payment");

    expect((await lilyPrisma.lilyPayment.findUnique({ where: { id: payment.id } }))?.status).toBe("approved");
    expect((await lilyPrisma.lilyOrder.findUnique({ where: { id: order.id } }))?.status).toBe("paid");
    expect(await lilyPrisma.lilyPaymentEvent.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await lilyPrisma.lilyPixSettlement.count({ where: { paymentId: payment.id } })).toBe(2);
  });
});
