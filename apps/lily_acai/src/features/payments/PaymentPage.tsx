import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  createLilyPayment,
  getLilyPayment,
  getLilyPaymentConfig,
  getOrderPayments,
  type LilyPayment,
  type LilyPaymentConfig
} from "./api";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function guestTokenKey(orderId: string) {
  return `cooklily:order-token:${orderId}`;
}

function paymentKey(orderId: string) {
  return `cooklily:payment-idempotency:${orderId}`;
}

export function storeGuestOrderToken(orderId: string, token: string) {
  sessionStorage.setItem(guestTokenKey(orderId), token);
}

export function PaymentPage() {
  const { orderId = "" } = useParams();
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [config, setConfig] = useState<LilyPaymentConfig | null>(null);
  const [payment, setPayment] = useState<LilyPayment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const guestAccessToken = useMemo(
    () => orderId ? sessionStorage.getItem(guestTokenKey(orderId)) : null,
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
    setPayment(result.payments[0] ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([access(), getLilyPaymentConfig()])
      .then(async ([current, paymentConfig]) => {
        if (cancelled) return;
        setConfig(paymentConfig);
        try {
          const result = await getOrderPayments({
            orderId,
            session: current,
            guestAccessToken
          });
          if (!cancelled) setPayment(result.payments[0] ?? null);
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível acessar este pedido.");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar pagamento.");
      })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [orderId]);

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

  async function createPayment() {
    if (!orderId) return;
    setBusy(true);
    setError("");
    try {
      let key = sessionStorage.getItem(paymentKey(orderId));
      if (!key) {
        key = `cooklily:payment:${crypto.randomUUID()}`;
        sessionStorage.setItem(paymentKey(orderId), key);
      }
      const created = await createLilyPayment({
        orderId,
        method: "manual_pix",
        idempotencyKey: key,
        session,
        guestAccessToken
      });
      setPayment(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInstructions() {
    if (!payment?.instructions) return;
    try {
      await navigator.clipboard.writeText(payment.instructions);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione as instruções manualmente.");
    }
  }

  if (!loaded) return <section className="payment-page"><h1>Carregando pagamento...</h1></section>;

  if (error && !payment) {
    return <section className="payment-page empty-state">
      <span className="eyebrow">Pagamento CookLily</span>
      <h1>Não foi possível abrir este pagamento.</h1>
      <p>{error}</p>
      <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>
    </section>;
  }

  return <section className="payment-page">
    <div className="checkout-heading">
      <div>
        <span className="eyebrow">Pagamento CookLily</span>
        <h1>{payment?.orderNumber ?? "Finalize seu pedido"}</h1>
        <p>A CookLily não armazena número de cartão nem CVV. O modo disponível nesta etapa é Pix com confirmação operacional.</p>
      </div>
      {session
        ? <Link className="button ghost" to="/pedidos">Meus pedidos</Link>
        : <Link className="button ghost" to="/cardapio">Cardápio</Link>}
    </div>

    {!config?.enabled && <div className="operation-warning">
      <strong>Pagamento ainda não habilitado pela equipe.</strong>
      <p>Seu pedido foi registrado, mas a cobrança online permanece fechada até a configuração financeira ser aprovada.</p>
    </div>}

    {config?.enabled && !payment && <section className="payment-start-card">
      <span className="eyebrow">Pix</span>
      <h2>Gerar instruções de pagamento</h2>
      <p>Ao continuar, o pagamento fica pendente até a equipe confirmar a entrada e reconciliar a referência financeira.</p>
      <button className="button primary" type="button" disabled={busy || !config.methods.some((method) => method.id === "manual_pix")} onClick={() => void createPayment()}>
        {busy ? "Preparando..." : "Continuar com Pix"}
      </button>
      {config.methods.length === 0 && <small>O Pix ainda não foi configurado.</small>}
    </section>}

    {payment && <div className="payment-layout">
      <section className="payment-status-card">
        <span className={`payment-status status-${payment.status}`}>
          {payment.status === "pending" ? "Aguardando confirmação"
            : payment.status === "approved" ? "Pagamento aprovado"
            : payment.status === "partially_refunded" ? "Parcialmente estornado"
            : payment.status === "refunded" ? "Estornado"
            : payment.status}
        </span>
        <strong className="payment-amount">{money(payment.amountCents)}</strong>

        {payment.status === "pending" && <>
          <p>Faça o Pix conforme as instruções abaixo. A confirmação não acontece por clique do cliente: o pedido só muda para pago depois da validação financeira.</p>
          {payment.instructions && <div className="pix-instructions">
            <pre>{payment.instructions}</pre>
            <button className="button ghost" type="button" onClick={() => void copyInstructions()}>
              {copied ? "Copiado" : "Copiar instruções"}
            </button>
          </div>}
          <button className="button primary" type="button" disabled={busy} onClick={() => {
            setBusy(true);
            refreshPayment().catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao verificar.")).finally(() => setBusy(false));
          }}>{busy ? "Verificando..." : "Já paguei · verificar status"}</button>
          <small>O status também é atualizado automaticamente nesta tela.</small>
        </>}

        {payment.status === "approved" && <>
          <h2>Pagamento confirmado.</h2>
          <p>O pedido já está marcado como pago e pode seguir para a operação.</p>
          {session && <Link className="button primary" to={`/pedidos/${payment.orderId}`}>Ver pedido</Link>}
          {!session && <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>}
        </>}

        {payment.refundedCents > 0 && <p>Valor estornado: <strong>{money(payment.refundedCents)}</strong>.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <aside className="payment-security-card">
        <strong>Segurança do pagamento</strong>
        <ul>
          <li>o total vem do pedido já recalculado no servidor;</li>
          <li>o pagamento é idempotente para evitar cobranças duplicadas;</li>
          <li>confirmações financeiras geram evento e reconciliação auditáveis;</li>
          <li>nenhum dado de cartão é solicitado pela CookLily.</li>
        </ul>
      </aside>
    </div>}
  </section>;
}
