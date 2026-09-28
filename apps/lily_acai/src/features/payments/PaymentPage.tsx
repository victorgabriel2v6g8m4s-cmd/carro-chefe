import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { readGuestOrderToken } from "../orders/guest-token";
import {
  createLilyPayment,
  getLilyPayment,
  getLilyPaymentConfig,
  getOrderPayments,
  type LilyPayment,
  type LilyPaymentConfig,
  type LilyPaymentMethod,
  type LilyPaymentOrderContext
} from "./api";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => {
      bricks: () => {
        create: (type: string, containerId: string, settings: Record<string, unknown>) => Promise<{
          unmount?: () => Promise<void> | void;
        }>;
      };
    };
  }
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function paymentKey(orderId: string, method: LilyPaymentMethod) {
  return `cooklily:payment-idempotency:${orderId}:${method}`;
}

function paymentIdempotencyKey(orderId: string, method: LilyPaymentMethod) {
  const storageKey = paymentKey(orderId, method);
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = `cooklily:payment:${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, key);
  }
  return key;
}

function clearPaymentKeys(orderId: string) {
  for (const method of ["manual_pix", "pix", "credit_card"] as const) {
    sessionStorage.removeItem(paymentKey(orderId, method));
  }
}

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-cooklily-mercado-pago="true"]');
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar checkout seguro.")), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.cooklilyMercadoPago = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar checkout seguro.")), { once: true });
    document.head.appendChild(script);
  });
}

type CardBrickPayload = {
  token: string;
  paymentMethodId: string;
  installments: number;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
};

function MercadoPagoCardBrick(props: {
  publicKey: string;
  amountCents: number;
  onSubmit: (payload: CardBrickPayload) => Promise<void>;
  onError: (message: string) => void;
}) {
  const submitRef = useRef(props.onSubmit);
  const errorRef = useRef(props.onError);
  submitRef.current = props.onSubmit;
  errorRef.current = props.onError;

  useEffect(() => {
    let disposed = false;
    let controller: { unmount?: () => Promise<void> | void } | null = null;

    void loadMercadoPagoSdk().then(async () => {
      if (disposed || !window.MercadoPago) return;
      const mp = new window.MercadoPago(props.publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      const createdController = await bricks.create("cardPayment", "cooklily-card-payment", {
        initialization: {
          amount: props.amountCents / 100
        },
        customization: {
          paymentMethods: {
            maxInstallments: 12,
            types: {
              excluded: ["debit_card", "prepaid_card"]
            }
          }
        },
        callbacks: {
          onReady: () => undefined,
          onSubmit: async (formData: any) => {
            const token = String(formData?.token ?? "");
            const paymentMethodId = String(formData?.payment_method_id ?? "");
            const installments = Number(formData?.installments ?? 1);
            const email = String(formData?.payer?.email ?? "").trim();
            const identificationType = String(formData?.payer?.identification?.type ?? "").trim();
            const identificationNumber = String(formData?.payer?.identification?.number ?? "").replace(/\D/g, "");

            await submitRef.current({
              token,
              paymentMethodId,
              installments,
              payer: {
                email,
                ...(identificationType && identificationNumber
                  ? { identification: { type: identificationType, number: identificationNumber } }
                  : {})
              }
            });
          },
          onError: () => {
            errorRef.current("Não foi possível carregar ou validar os dados do cartão.");
          }
        }
      });
      if (disposed) {
        if (createdController.unmount) await createdController.unmount();
        return;
      }
      controller = createdController;
    }).catch((cause) => {
      errorRef.current(cause instanceof Error ? cause.message : "Falha ao carregar checkout seguro.");
    });

    return () => {
      disposed = true;
      if (controller?.unmount) void controller.unmount();
    };
  }, [props.publicKey, props.amountCents]);

  return <div className="card-brick-shell">
    <div id="cooklily-card-payment" />
    <small>Os dados sensíveis do cartão são tokenizados pelo Mercado Pago e não passam pelos servidores da CookLily.</small>
  </div>;
}

export function PaymentPage() {
  const { orderId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const homologation = searchParams.get("homologacao") === "1";
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [config, setConfig] = useState<LilyPaymentConfig | null>(null);
  const [order, setOrder] = useState<LilyPaymentOrderContext | null>(null);
  const [payment, setPayment] = useState<LilyPayment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<LilyPaymentMethod>("pix");
  const [payerEmail, setPayerEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const guestAccessToken = useMemo(
    () => orderId ? readGuestOrderToken(orderId) : null,
    [orderId]
  );

  async function access() {
    let current: AuthPayload | null = null;
    try {
      current = await getLilySession();
      setSession(current);
    } catch {
      setSession(null);
    }
    return current;
  }

  async function refreshPayment(currentSession = session) {
    if (!orderId) return;
    const result = await getOrderPayments({
      orderId,
      session: currentSession,
      guestAccessToken
    });
    setOrder(result.order);
    setPayment(result.payments[0] ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    void access().then(async (current) => {
      const [paymentConfig, result] = await Promise.all([
        getLilyPaymentConfig({ session: current, homologation }),
        getOrderPayments({ orderId, session: current, guestAccessToken })
      ]);
      if (cancelled) return;
      setConfig(paymentConfig);
      setOrder(result.order);
      setPayment(result.payments[0] ?? null);
      const preferred = paymentConfig.methods.find((method) => method.id === "pix")
        ?? paymentConfig.methods.find((method) => method.id === "manual_pix")
        ?? paymentConfig.methods[0];
      if (preferred) setSelectedMethod(preferred.id);
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar pagamento.");
    }).finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [orderId, guestAccessToken]);

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const timer = window.setInterval(() => {
      getLilyPayment({
        paymentId: payment.id,
        session,
        guestAccessToken
      }).then(setPayment).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [payment?.id, payment?.status, session?.user.id, guestAccessToken]);

  async function submitPayment(input: {
    method: LilyPaymentMethod;
    payer?: CardBrickPayload["payer"];
    card?: Omit<CardBrickPayload, "payer">;
  }) {
    if (!orderId) return;
    setBusy(true);
    setError("");
    try {
      const created = await createLilyPayment({
        orderId,
        method: input.method,
        idempotencyKey: paymentIdempotencyKey(orderId, input.method),
        session,
        guestAccessToken,
        homologation,
        ...(input.payer ? { payer: input.payer } : {}),
        ...(input.card ? { card: input.card } : {})
      });
      if (created.status === "failed") {
        sessionStorage.removeItem(paymentKey(orderId, input.method));
      }
      setPayment(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento.");
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function createPixPayment() {
    if (selectedMethod === "pix") {
      if (config?.provider === "cooklily_pix") {
        await submitPayment({ method: "pix" });
        return;
      }
      const email = payerEmail.trim();
      if (!email || !email.includes("@")) {
        setError("Informe um e-mail válido para gerar o Pix.");
        return;
      }
      await submitPayment({ method: "pix", payer: { email } });
      return;
    }
    await submitPayment({ method: "manual_pix" });
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

  function retryPayment() {
    clearPaymentKeys(orderId);
    setPayment(null);
    setError("");
  }

  if (!loaded) return <section className="payment-page"><h1>Carregando pagamento...</h1></section>;

  if (error && !order && !payment) {
    return <section className="payment-page empty-state">
      <span className="eyebrow">Pagamento CookLily</span>
      <h1>Não foi possível abrir este pagamento.</h1>
      <p>{error}</p>
      <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>
    </section>;
  }

  const methods = config?.methods ?? [];
  const automaticPix = methods.some((method) => method.id === "pix");
  const manualPix = methods.some((method) => method.id === "manual_pix");
  const cardEnabled = methods.some((method) => method.id === "credit_card");
  const ownPix = config?.provider === "cooklily_pix";

  return <section className="payment-page">
    <div className="checkout-heading">
      <div>
        <span className="eyebrow">Pagamento CookLily</span>
        <h1>{payment?.orderNumber ?? order?.orderNumber ?? "Finalize seu pedido"}</h1>
        <p>Pagamento seguro, com confirmação financeira vinculada diretamente ao pedido.</p>
      </div>
      {session
        ? <Link className="button ghost" to="/pedidos">Meus pedidos</Link>
        : <Link className="button ghost" to="/cardapio">Cardápio</Link>}
    </div>

    {homologation && <div className="operation-warning homologation-banner">
      <strong>Modo de homologação ativo.</strong>
      <p>Este pedido está marcado como teste. A operação pública pode continuar fechada enquanto você valida o gateway.</p>
    </div>}

    {!config?.enabled && <div className="operation-warning">
      <strong>Pagamento ainda não habilitado pela equipe.</strong>
      <p>Seu pedido foi registrado, mas a cobrança online permanece fechada até a configuração financeira ser aprovada.</p>
    </div>}

    {config?.enabled && !config.providerConfigured && <div className="operation-warning">
      <strong>Processador ainda não configurado.</strong>
      <p>O pedido está salvo, mas a equipe ainda precisa concluir as credenciais do processador.</p>
    </div>}

    {config?.enabled && config.providerConfigured && !payment && order && <section className="payment-start-card">
      <span className="eyebrow">Escolha como pagar</span>
      <h2>{money(order.amountCents)}</h2>

      {methods.length > 1 && <div className="payment-method-options" role="group" aria-label="Meio de pagamento">
        {methods.map((method) => <button
          key={method.id}
          className={`button ${selectedMethod === method.id ? "primary" : "ghost"}`}
          type="button"
          onClick={() => { setSelectedMethod(method.id); setError(""); }}
        >
          {method.label}
        </button>)}
      </div>}

      {(selectedMethod === "pix" || selectedMethod === "manual_pix") && (automaticPix || manualPix) && <>
        {selectedMethod === "pix" && !ownPix && <label className="payment-email">
          E-mail para o pagamento
          <input
            type="email"
            autoComplete="email"
            value={payerEmail}
            onChange={(event) => setPayerEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            required
          />
        </label>}
        <p>{selectedMethod === "pix"
          ? ownPix
            ? "A CookLily gera o Pix Copia e Cola diretamente, sem gateway. Nesta primeira fase a entrada ainda é conciliada pela equipe."
            : "O QR Code e o Pix Copia e Cola serão gerados para este pedido e confirmados automaticamente."
          : "A equipe fará a confirmação operacional do Pix depois da entrada financeira."}</p>
        <button className="button primary" type="button" disabled={busy} onClick={() => void createPixPayment()}>
          {busy ? "Preparando..." : selectedMethod === "pix" ? "Gerar Pix" : "Continuar com Pix"}
        </button>
      </>}

      {selectedMethod === "credit_card" && cardEnabled && config.publicKey && <MercadoPagoCardBrick
        publicKey={config.publicKey}
        amountCents={order.amountCents}
        onError={setError}
        onSubmit={async (payload) => {
          await submitPayment({
            method: "credit_card",
            payer: payload.payer,
            card: {
              token: payload.token,
              paymentMethodId: payload.paymentMethodId,
              installments: payload.installments
            }
          });
        }}
      />}

      {error && <p className="error" role="alert">{error}</p>}
    </section>}

    {payment && <div className="payment-layout">
      <section className="payment-status-card">
        <span className={`payment-status status-${payment.status}`}>
          {payment.status === "pending" ? "Aguardando pagamento"
            : payment.status === "approved" ? "Pagamento aprovado"
            : payment.status === "partially_refunded" ? "Parcialmente estornado"
            : payment.status === "refunded" ? "Estornado"
            : payment.status === "cancelled" ? "Cancelado"
            : payment.status === "failed" ? "Pagamento não aprovado"
            : payment.status}
        </span>
        <strong className="payment-amount">{money(payment.amountCents)}</strong>

        {payment.status === "pending" && payment.method === "pix" && <>
          <p>{payment.provider === "cooklily_pix"
            ? "Copie o código Pix gerado pela CookLily. A confirmação aparecerá após a conciliação da entrada."
            : "Use o QR Code ou copie o código Pix. A confirmação acontece automaticamente quando o processador registrar o pagamento."}</p>
          {payment.providerData?.qrCodeBase64 && <img
            className="pix-qr-code"
            src={`data:image/png;base64,${payment.providerData.qrCodeBase64}`}
            alt="QR Code Pix deste pedido"
          />}
          {(payment.providerData?.qrCode || payment.instructions) && <div className="pix-instructions">
            <pre>{payment.providerData?.qrCode || payment.instructions}</pre>
            <button className="button ghost" type="button" onClick={() => void copyPix()}>
              {copied ? "Copiado" : "Copiar Pix"}
            </button>
          </div>}
          {payment.providerData?.ticketUrl && <a
            className="button ghost"
            href={payment.providerData.ticketUrl}
            target="_blank"
            rel="noreferrer"
          >Abrir pagamento</a>}
        </>}

        {payment.status === "pending" && payment.method === "manual_pix" && <>
          <p>Faça o Pix conforme as instruções abaixo. A confirmação será feita pela equipe após validar a entrada financeira.</p>
          {payment.instructions && <div className="pix-instructions">
            <pre>{payment.instructions}</pre>
            <button className="button ghost" type="button" onClick={() => void copyPix()}>
              {copied ? "Copiado" : "Copiar instruções"}
            </button>
          </div>}
        </>}

        {payment.status === "pending" && <>
          <button className="button primary" type="button" disabled={busy} onClick={() => {
            setBusy(true);
            refreshPayment().catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao verificar.")).finally(() => setBusy(false));
          }}>{busy ? "Verificando..." : "Verificar status"}</button>
          <small>O status também é atualizado automaticamente nesta tela.</small>
        </>}

        {payment.status === "approved" && <>
          <h2>Pagamento confirmado.</h2>
          <p>O pedido já está marcado como pago e pode seguir para a operação.</p>
          {session && <Link className="button primary" to={`/pedidos/${payment.orderId}`}>Ver pedido</Link>}
          {!session && <Link className="button primary" to={`/acompanhar/${payment.orderId}`}>Acompanhar pedido</Link>}
        </>}

        {["failed", "cancelled"].includes(payment.status) && <>
          <p>Esta tentativa não concluiu a cobrança. Você pode iniciar um novo pagamento.</p>
          <button className="button primary" type="button" onClick={retryPayment}>Tentar novamente</button>
        </>}

        {payment.refundedCents > 0 && <p>Valor estornado: <strong>{money(payment.refundedCents)}</strong>.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <aside className="payment-security-card">
        <strong>Segurança do pagamento</strong>
        <ul>
          <li>o valor cobrado vem do pedido recalculado no servidor;</li>
          <li>a idempotência evita duplicidade por repetição da mesma tentativa;</li>
          <li>webhooks são assinados e o backend reconfirma o estado diretamente no processador;</li>
          <li>um pedido só vira pago automaticamente quando o valor aprovado coincide com o total esperado;</li>
          <li>número do cartão e CVV são tokenizados pelo processador e não passam pela API CookLily.</li>
        </ul>
      </aside>
    </div>}
  </section>;
}
