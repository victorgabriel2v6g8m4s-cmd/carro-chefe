import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildStaticPixPayload,
  cookLilyPixConfiguration,
  createCookLilyPixPayment,
  pixCrc16
} from "./cooklily-pix-provider";

const snapshot = {
  key: process.env.COOKLILY_PIX_KEY,
  name: process.env.COOKLILY_PIX_MERCHANT_NAME,
  city: process.env.COOKLILY_PIX_MERCHANT_CITY
};

beforeEach(() => {
  process.env.COOKLILY_PIX_KEY = "123e4567-e12b-12d1-a456-426655440000";
  process.env.COOKLILY_PIX_MERCHANT_NAME = "Fulano de Tal";
  process.env.COOKLILY_PIX_MERCHANT_CITY = "BRASILIA";
});

afterEach(() => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore("COOKLILY_PIX_KEY", snapshot.key);
  restore("COOKLILY_PIX_MERCHANT_NAME", snapshot.name);
  restore("COOKLILY_PIX_MERCHANT_CITY", snapshot.city);
});

describe("CookLily Pix próprio", () => {
  it("reproduz o exemplo oficial de BR Code estático do Banco Central", () => {
    const payload = buildStaticPixPayload({
      key: "123e4567-e12b-12d1-a456-426655440000",
      merchantName: "Fulano de Tal",
      merchantCity: "BRASILIA",
      txid: "***"
    });

    expect(payload).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D"
    );
  });

  it("gera valor, txid e CRC válidos sem chamar gateway externo", () => {
    const payload = buildStaticPixPayload({
      key: "pix@example.com",
      merchantName: "CookLily",
      merchantCity: "Campo Grande",
      amountCents: 2590,
      txid: "CLABC123"
    });

    expect(payload).toContain("540525.90");
    expect(payload).toContain("62091208CLABC123");
    expect(payload).toContain("0014br.gov.bcb.pix");

    const withoutCrc = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(pixCrc16(withoutCrc));
  });

  it("normaliza nome e cidade para BR Code sem acentos", () => {
    const payload = buildStaticPixPayload({
      key: "+5567999999999",
      merchantName: "CookLíly Açai",
      merchantCity: "Campo Grande",
      amountCents: 1000,
      txid: "CLTESTE1"
    });

    expect(payload).toContain("CookLily Acai");
    expect(payload).toContain("Campo Grande");
  });

  it("readiness não expõe a chave Pix", () => {
    const configuration = cookLilyPixConfiguration();
    expect(configuration).toEqual({
      keyConfigured: true,
      merchantNameConfigured: true,
      merchantCityConfigured: true,
      ready: true
    });
    expect(JSON.stringify(configuration)).not.toContain(process.env.COOKLILY_PIX_KEY);
  });

  it("cria pagamento pendente com txid próprio e Pix Copia e Cola", async () => {
    const payment = await createCookLilyPixPayment({
      paymentId: "payment-local-1",
      orderId: "order-local-1",
      orderNumber: "CL-1001",
      amountCents: 3190,
      currency: "BRL",
      method: "pix",
      idempotencyKey: "cooklily-pix-test-0001"
    });

    expect(payment.status).toBe("pending");
    expect(payment.providerPaymentId).toMatch(/^CL[a-f0-9]{23}$/);
    expect(payment.providerReference).toBe(payment.providerPaymentId);
    expect(payment.instructions).toContain("5303986");
    expect(payment.providerData?.qrCode).toBe(payment.instructions);
    expect(payment.providerData?.paymentMethodType).toBe("static_br_code");
    expect(payment.paidCents).toBeNull();
  });
});
