import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { trackLilyAnalytics } from "../../analytics";
import { readGuestOrderToken } from "../orders/guest-token";
import { getLilyPayment } from "./api";
import { MercadoPagoCardChoiceBrick, type MercadoPagoCardPayload } from "./MercadoPagoCardChoiceBrick";
import {
  createLilyPaymentChoice,
  getLilyPaymentOptions,
  type LilyCheckoutPaymentMethod,
  type LilyChoicePayment,
  type LilyPaymentOption,
  type LilyPaymentOptionsPayload
} from "./payment-choice-api";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function idempotencyStorageKey(orderId: string, method: LilyCheckoutPaymentMethod) {
  return `cooklily:payment-choice-idempotency:${orderId}:${method}`;
}

function paymentIdempotencyKey(orderId: string, method: LilyCheckoutPaymentMethod) {
  const storageKey = idempotencyStorageKey(orderId, method);
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = `cooklily:payment-choice:${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, key);
  }
  return key;
}

function clearPaymentKeys(orderId: string) {
  for (const method of ["pix", "credit_card", "debit_card"] as const) {
    sessionStorage.removeItem(idempotencyStorageKey(orderId, method));
  }
}

function methodHint(option: LilyPaymentOption) {
  if (option.id === "pix") {
    const providers = option.providers;
    if (providers[0] === "cooklily_pix") {
      if (providers.includes("mercado_pago") && providers.includes("manual")) {
        return "Pix próprio CookLily. Se necessário, o sistema tenta Mercado Pago e por último o Pix manual.";
      }
      if (providers.includes("mercado_pago")) return "Pix próprio CookLily, com Mercado Pago como fallback.";
      if (providers.includes("manual")) return "Pix próprio CookLily, com contingência manual.";
      return "BR Code e Pix Copia e Cola gerados pela própria CookLily.";
    }
    if (providers[0] === "mercado_pago") return "Pix automático via Mercado Pago; contingência manual somente se configurada.";
    return "Pix de contingência com confirmação manual pela equipe.";
  }
  return option.id === "debit_card"
    ? "Cartão de débito via Mercado Pago, tokenizado e cobrado em uma parcela."
    : "Cartão de crédito via Mercado Pago, com tokenização e parcelamento disponível.";
}

function PriceSummary({ option }: { option: LilyPaymentOption }) {
  const price = option.pricing;
  return <div className="payment-price-summary" aria-live="polite">
    {price.discountCents > 0 && <>
      <span>Valor do pedido <strong>{money(price.baseAmountCents)}</strong></span>
      <span className="state-live">Desconto desta forma de pagamento <strong>- {money(price.discountCents)}</strong></span>
    </>}
    <span>Total a pagar <strong>{money(price.amountCents)}</strong></span>
    {price.deliveryFeeCents > 0 && price.discountCents > 0 && <small>O desconto não reduz a taxa de entrega.</small>}
  </div>;
}

function PaymentResult(props: {
  payment: LilyChoicePayment;
  copied: boolean;
  onCopy: () => void;
  onRetry: () => void;
}) {
  const payment = props.payment;
  const pixValue = payment.providerData?.qrCode || payment.instructions;
  const providerLabel = payment.provider === "cooklily_pix" ? "Pix CookLily"
    : payment.provider === "mercado_pago" ? "Mercado Pago"
    : payment.provider === "manual" ? "Pix manual de contingência"
    : payment.provider;

  if (payment.status === "approved") {
    return <section className="payment-result success-card">
      <span className="eyebrow">Pagamento confirmado</span>
      <h2>{money(payment.amountCents)}</h2>
      {payment.pricing.discountCents > 0 && <p>Você economizou {money(payment.pricing.discountCents)} com esta forma de pagamento.</p>}
      <p>O pedido já pode seguir para a operação.</p>
      <Link className="button primary" to="/pedidos">Acompanhar pedido</Link>
    </section>;
  }

  if (payment.status === "failed" || payment.status === "cancelled") {
    return <section className="payment-result operation-warning">
      <strong>Este pagamento não foi concluído.</strong>
      <p>Nenhuma nova cobrança será criada até você tentar novamente.</p>
      <button className="button primary" type="button" onClick={props.onRetry}>Escolher outra forma</button>
    </section>;
  }

  return <section className="payment-result">
    <span className="eyebrow">Pagamento pendente · {providerLabel}</span>
    <h2>{money(payment.amountCents)}</h2>
    {payment.pricing.discountCents > 0 && <p>Desconto aplicado: {money(payment.pricing.discountCents)}.</p>}
    {pixValue && <>
      {payment.providerData?.qrCodeBase64 && <img
        className="pix-qr-image"
        src={`data:image/png;base64,${payment.providerData.qrCodeBase64}`}
        alt="QR Code Pix"
      />}
      <label className="payment-pix-code">Pix Copia e Cola
        <textarea readOnly rows={5} value={pixValue} />
      </label>
      <button className="button primary" type="button" onClick={props.onCopy}>
        {props.copied ? "Copiado" : "Copiar código Pix"}
      </button>
    </>}
    {!pixValue && <p>{payment.instructions || "Aguardando confirmação do processador."}</p>}
    {payment.provider === "manual" && <div className="operation-warning">
      <strong>Contingência manual ativada.</strong>
      <p>Use as instruções acima. A equipe confirma o recebimento antes de liberar o pedido.</p>
    </div>}
  </section>;
}

export function PaymentChoicePage() {
  const { orderId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const homologation = searchParams.get("homologacao") === "1";
  const guestAccessToken = useMemo(() => orderId ? readGuestOrderToken(orderId) : null, [orderId]);
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<LilyPaymentOptionsPayload | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<LilyCheckoutPaymentMethod>("pix");
  const [payment, setPayment] = useState<LilyChoicePayment | null>(null);
  const [payerEmail, setPayerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let current: AuthPayload | null = null;
      try { current = await getLilySession(); } catch { current = null; }
      if (cancelled) return;
      setSession(current);
      const payload = await getLilyPaymentOptions({ orderId, session: current, guestAccessToken, homologation });
      if (cancelled) return;
      setData(payload);
      setPayment(payload.activePayment);
      const preferred = payload.methods.find((method) => method.id === "pix" && method.available)
        ?? payload.methods.find((method) => method.available);
      if (preferred) setSelectedMethod(preferred.id);
    })().catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o pagamento.");
    }).finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [orderId, guestAccessToken, homologation]);

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const timer = window.setInterval(() => {
      getLilyPayment({ paymentId: payment.id, session, guestAccessToken }).then((remote) => {
        setPayment((current) => current ? {
          ...current,
          status: remote.status,
          provider: remote.provider,
          instructions: remote.instructions,
          providerData: remote.providerData,
          approvedAt: remote.approvedAt,
          failedAt: remote.failedAt,
          updatedAt: remote.updatedAt
        } : current);
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [payment?.id, payment?.status, session?.user.id, guestAccessToken]);

  useEffect(() => {
    if (!payment || payment.status !== "approved") return;
    const key = `cooklily.analytics.payment-confirmed:${payment.id}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch { /* analytics é best-effort */ }
    trackLilyAnalytics("payment_confirmed", {
      surface: "payment",
      paymentMethod: payment.method as LilyCheckoutPaymentMethod
    });
  }, [payment?.id, payment?.status, payment?.method]);

  const availableMethods = data?.methods.filter((method) => method.available) ?? [];
  const option = data?.methods.find((method) => method.id === selectedMethod) ?? availableMethods[0] ?? null;

  async function submit(input: {
    method: LilyCheckoutPaymentMethod;
    payer?: MercadoPagoCardPayload["payer"];
    card?: Omit<MercadoPagoCardPayload, "payer">;
  }) {
    if (!orderId) return;
    setBusy(true);
    setError("");
    try {
      const created = await createLilyPaymentChoice({
        orderId,
        method: input.method,
        idempotencyKey: paymentIdempotencyKey(orderId, input.method),
        session,
        guestAccessToken,
        homologation,
        ...(input.payer ? { payer: input.payer } : {}),
        ...(input.card ? { card: input.card } : {})
      });
      trackLilyAnalytics("payment_start", { surface: "payment", paymentMethod: input.method });
      setPayment(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento.");
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function createPixPayment() {
    if (!option || option.id !== "pix") return;
    const email = payerEmail.trim();
    if (option.requiresPayerEmail && (!email || !email.includes("@"))) {
      setError("Informe um e-mail válido para gerar o Pix pelo fallback disponível.");
      return;
    }
    await submit({ method: "pix", ...(email ? { payer: { email } } : {}) });
  }

  async function copyPix() {
    const value = payment?.providerData?.qrCode || payment?.instructions;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código manualmente.");
    }
  }

  function retry() {
    clearPaymentKeys(orderId);
    setPayment(null);
    setError("");
  }

  if (!loaded) return <section className="payment-page"><h1>Carregando pagamento...</h1></section>;
  if (!data) return <section className="payment-page empty-state">
    <span className="eyebrow">Pagamento CookLily</span>
    <h1>Não foi possível abrir este pagamento.</h1>
    <p>{error || "Pedido indisponível."}</p>
    <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>
  </section>;

  return <section className="payment-page">
    <div className="checkout-heading">
      <div>
        <span className="eyebrow">Pagamento CookLily</span>
        <h1>{data.order.orderNumber}</h1>
        <p>Escolha a forma de pagamento antes de iniciar a cobrança.</p>
      </div>
      <Link className="button ghost" to={session ? "/pedidos" : "/cardapio"}>{session ? "Meus pedidos" : "Cardápio"}</Link>
    </div>

    {homologation && <div className="operation-warning"><strong>Modo de homologação ativo.</strong></div>}
    {!data.enabled && <div className="operation-warning">
      <strong>Pagamentos ainda não estão habilitados.</strong>
      <p>O pedido permanece salvo, mas nenhuma cobrança pode ser criada.</p>
    </div>}

    {payment
      ? <PaymentResult payment={payment} copied={copied} onCopy={() => void copyPix()} onRetry={retry} />
      : data.enabled && <section className="payment-start-card">
          <span className="eyebrow">Escolha como pagar</span>
          <div className="payment-method-options" role="radiogroup" aria-label="Forma de pagamento">
            {data.methods.map((method) => <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selectedMethod === method.id}
              disabled={!method.available || busy}
              className={`button ${selectedMethod === method.id ? "primary" : "ghost"}`}
              onClick={() => { setSelectedMethod(method.id); setError(""); }}
            >
              {method.label}{method.discountLabel ? ` · ${method.discountLabel}` : ""}
            </button>)}
          </div>

          {option && <>
            <PriceSummary option={option} />
            <p>{methodHint(option)}</p>

            {option.id === "pix" && <>
              {option.fallbackMayUsePayerEmail && <label className="payment-email">
                E-mail {option.requiresPayerEmail ? "obrigatório" : "opcional para fallback Mercado Pago"}
                <input
                  type="email"
                  autoComplete="email"
                  value={payerEmail}
                  onChange={(event) => setPayerEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  required={option.requiresPayerEmail}
                />
              </label>}
              <button className="button primary" type="button" disabled={busy} onClick={() => void createPixPayment()}>
                {busy ? "Gerando..." : `Gerar Pix · ${money(option.pricing.amountCents)}`}
              </button>
            </>}

            {(option.id === "credit_card" || option.id === "debit_card") && <>
              {!data.publicKey
                ? <div className="operation-warning"><strong>Checkout de cartão indisponível.</strong><p>A Public Key do Mercado Pago não está configurada.</p></div>
                : <MercadoPagoCardChoiceBrick
                    method={option.id}
                    publicKey={data.publicKey}
                    amountCents={option.pricing.amountCents}
                    onError={setError}
                    onSubmit={async (payload) => {
                      await submit({
                        method: option.id,
                        payer: payload.payer,
                        card: {
                          token: payload.token,
                          paymentMethodId: payload.paymentMethodId,
                          installments: payload.installments
                        }
                      });
                    }}
                  />}
            </>}
          </>}
        </section>}

    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
