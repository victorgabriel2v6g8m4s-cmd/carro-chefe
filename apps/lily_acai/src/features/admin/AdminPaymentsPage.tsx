import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  cancelAdminPayment,
  confirmAdminPayment,
  getAdminPayments,
  getAdminPaymentSettings,
  reconcileAdminPayment,
  refundAdminPayment,
  saveAdminPaymentSettings,
  type AdminPayment,
  type AdminPaymentSettings
} from "../payments/api";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function moneyInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function statusLabel(status: string) {
  return status === "pending" ? "Pendente"
    : status === "approved" ? "Aprovado"
    : status === "partially_refunded" ? "Estorno parcial"
    : status === "refunded" ? "Estornado"
    : status === "cancelled" ? "Cancelado"
    : status;
}

export function AdminPaymentsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = session?.user.role === "admin";

  async function refresh(nextStatus = status) {
    const current = await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
    const [nextSettings, nextPayments] = await Promise.all([
      getAdminPaymentSettings(),
      getAdminPayments(nextStatus || undefined)
    ]);
    setSession(current);
    setSettings(nextSettings);
    setPayments(nextPayments.payments);
  }

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível abrir pagamentos."))
      .finally(() => setLoaded(true));
  }, []);

  const kpis = useMemo(() => {
    const list = payments ?? [];
    return {
      pending: list.filter((payment) => payment.status === "pending").length,
      approvedCents: list.filter((payment) => ["approved", "partially_refunded"].includes(payment.status))
        .reduce((sum, payment) => sum + payment.amountCents - payment.refundedCents, 0),
      discrepancies: list.filter((payment) => payment.reconciliations.some((row) => row.status === "discrepant")).length
    };
  }, [payments]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !settings || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    setBusyId("settings");
    setError("");
    setMessage("");
    try {
      const updated = await saveAdminPaymentSettings({
        paymentsEnabled: form.get("paymentsEnabled") === "on",
        paymentProvider: "manual",
        manualPixEnabled: form.get("manualPixEnabled") === "on",
        manualPixInstructions: String(form.get("manualPixInstructions") || "") || null
      }, session.csrfToken);
      setSettings(updated);
      setMessage("Configuração financeira atualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar pagamentos.");
    } finally {
      setBusyId("");
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>, payment: AdminPayment) {
    event.preventDefault();
    if (!session || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    setBusyId(payment.id);
    setError("");
    setMessage("");
    try {
      await confirmAdminPayment(payment.id, {
        providerReference: String(form.get("providerReference") || ""),
        reportedGrossCents: parseMoney(form.get("reportedGross")),
        feeCents: parseMoney(form.get("fee")),
        netCents: parseMoney(form.get("net")),
        note: String(form.get("note") || "") || null
      }, session.csrfToken);
      setMessage(`Pagamento ${payment.order.orderNumber} confirmado e reconciliado.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setBusyId("");
    }
  }

  async function reconcile(event: FormEvent<HTMLFormElement>, payment: AdminPayment) {
    event.preventDefault();
    if (!session || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    setBusyId(payment.id);
    setError("");
    setMessage("");
    try {
      await reconcileAdminPayment(payment.id, {
        reportedGrossCents: parseMoney(form.get("reportedGross")),
        feeCents: parseMoney(form.get("fee")),
        netCents: parseMoney(form.get("net")),
        providerReference: String(form.get("providerReference") || "") || null,
        note: String(form.get("note") || "") || null
      }, session.csrfToken);
      setMessage(`Reconciliação registrada para ${payment.order.orderNumber}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível reconciliar.");
    } finally {
      setBusyId("");
    }
  }

  async function refund(event: FormEvent<HTMLFormElement>, payment: AdminPayment) {
    event.preventDefault();
    if (!session || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    setBusyId(payment.id);
    setError("");
    setMessage("");
    try {
      await refundAdminPayment(payment.id, {
        amountCents: parseMoney(form.get("amount")),
        providerReference: String(form.get("providerReference") || ""),
        note: String(form.get("note") || "") || null
      }, session.csrfToken);
      setMessage(`Estorno registrado para ${payment.order.orderNumber}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o estorno.");
    } finally {
      setBusyId("");
    }
  }

  if (!loaded) return <section className="admin-state"><h1>Carregando pagamentos...</h1></section>;
  if (!session || !settings || !payments) return <section className="admin-state">
    <span className="eyebrow">CookLily · financeiro</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error || "Entre com uma conta da equipe."}</p>
    <Link className="button primary" to="/entrar?next=/painel/pagamentos">Entrar</Link>
  </section>;

  return <section className="admin-page payments-admin-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">Entrega 07 · financeiro</span>
        <h1>Pagamentos e reconciliação</h1>
        <p>Pix manual auditável enquanto um provedor automático não for aprovado. Nenhum cartão é armazenado.</p>
      </div>
      <Link className="button ghost" to="/painel">Painel</Link>
    </div>

    {!isAdmin && <div className="operation-warning">
      <strong>Modo somente leitura.</strong>
      <p>Seu perfil staff pode consultar pagamentos, mas confirmação, configuração, reconciliação e estorno exigem papel admin.</p>
    </div>}

    <div className="admin-kpis">
      <article><strong>{kpis.pending}</strong><span>pagamentos pendentes</span></article>
      <article><strong>{money(kpis.approvedCents)}</strong><span>saldo pago após estornos</span></article>
      <article><strong>{kpis.discrepancies}</strong><span>com divergência</span></article>
    </div>

    <form className="checkout-section payment-settings-form" onSubmit={saveSettings}>
      <div>
        <h2>Configuração</h2>
        <p>O modo atual é manual. Ativar pagamentos exige instruções Pix preenchidas. Trocar para um gateway automático será feito por adaptador, sem reescrever pedidos.</p>
      </div>
      <label className="check">
        <input name="paymentsEnabled" type="checkbox" defaultChecked={settings.paymentsEnabled} disabled={!isAdmin} />
        <span>Pagamentos habilitados</span>
      </label>
      <label className="check">
        <input name="manualPixEnabled" type="checkbox" defaultChecked={settings.manualPixEnabled} disabled={!isAdmin} />
        <span>Pix manual habilitado</span>
      </label>
      <label>Instruções Pix
        <textarea name="manualPixInstructions" rows={5} defaultValue={settings.manualPixInstructions ?? ""} disabled={!isAdmin}
          placeholder="Ex.: chave Pix, favorecido e instrução para identificação. Não inclua segredos administrativos." />
      </label>
      <small>Essas instruções são copiadas para o snapshot do pagamento no momento da criação.</small>
      {isAdmin && <button className="button primary" type="submit" disabled={busyId === "settings"}>
        {busyId === "settings" ? "Salvando..." : "Salvar configuração"}
      </button>}
    </form>

    <div className="payment-admin-toolbar">
      <label>Status
        <select value={status} onChange={(event) => {
          const value = event.target.value;
          setStatus(value);
          refresh(value).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao filtrar."));
        }}>
          <option value="">Todos</option>
          <option value="pending">Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="partially_refunded">Estorno parcial</option>
          <option value="refunded">Estornado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>
      <button className="button ghost" type="button" onClick={() => void refresh()}>Atualizar</button>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}

    <div className="payment-admin-list">
      {payments.length === 0 && <div className="empty-state"><p>Nenhum pagamento encontrado.</p></div>}
      {payments.map((payment) => {
        const latestRecon = payment.reconciliations[0];
        const remaining = payment.amountCents - payment.refundedCents;
        return <article className="payment-admin-card" key={payment.id}>
          <header>
            <div>
              <span className={`payment-status status-${payment.status}`}>{statusLabel(payment.status)}</span>
              <strong>{payment.order.orderNumber}</strong>
              <small>{payment.order.phone} · {new Date(payment.createdAt).toLocaleString("pt-BR")}</small>
            </div>
            <div className="payment-admin-amount">
              <strong>{money(payment.amountCents)}</strong>
              {payment.refundedCents > 0 && <small>estornado {money(payment.refundedCents)}</small>}
            </div>
          </header>

          <div className="payment-admin-meta">
            <span>método: <strong>{payment.method === "manual_pix" ? "Pix manual" : payment.method}</strong></span>
            <span>pedido: <strong>{statusLabel(payment.order.status)}</strong></span>
            {payment.providerReference && <span>referência: <strong>{payment.providerReference}</strong></span>}
            {latestRecon && <span>reconciliação: <strong className={latestRecon.status === "matched" ? "state-live" : "state-off"}>
              {latestRecon.status === "matched" ? "conciliado" : `divergência ${money(latestRecon.discrepancyCents)}`}
            </strong></span>}
          </div>

          {payment.status === "pending" && isAdmin && <form className="payment-finance-form" onSubmit={(event) => void confirm(event, payment)}>
            <h3>Confirmar entrada</h3>
            <label>Referência bancária<input name="providerReference" required placeholder="ID/identificador do comprovante no extrato" /></label>
            <label>Bruto<input name="reportedGross" defaultValue={moneyInput(payment.amountCents)} inputMode="decimal" required /></label>
            <label>Taxa<input name="fee" defaultValue="0,00" inputMode="decimal" required /></label>
            <label>Líquido<input name="net" defaultValue={moneyInput(payment.amountCents)} inputMode="decimal" required /></label>
            <label className="wide">Observação<input name="note" /></label>
            <div className="payment-finance-actions">
              <button className="button primary" type="submit" disabled={busyId === payment.id}>Confirmar e reconciliar</button>
              <button className="button ghost" type="button" disabled={busyId === payment.id} onClick={async () => {
                setBusyId(payment.id);
                setError("");
                try {
                  await cancelAdminPayment(payment.id, session.csrfToken);
                  await refresh();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Não foi possível cancelar.");
                } finally {
                  setBusyId("");
                }
              }}>Cancelar cobrança</button>
            </div>
          </form>}

          {["approved", "partially_refunded", "refunded"].includes(payment.status) && <details className="payment-reconciliation-details">
            <summary>Histórico de reconciliação ({payment.reconciliations.length})</summary>
            {payment.reconciliations.map((row, index) => <div className="reconciliation-row" key={`${row.createdAt}-${index}`}>
              <span>{new Date(row.createdAt).toLocaleString("pt-BR")}</span>
              <span>bruto {money(row.reportedGrossCents)}</span>
              <span>taxa {money(row.feeCents)}</span>
              <span>líquido {money(row.netCents)}</span>
              <strong className={row.status === "matched" ? "state-live" : "state-off"}>{row.status}</strong>
            </div>)}
          </details>}

          {isAdmin && ["approved", "partially_refunded"].includes(payment.status) && <>
            <details className="payment-admin-action">
              <summary>Nova reconciliação</summary>
              <form className="payment-finance-form" onSubmit={(event) => void reconcile(event, payment)}>
                <label>Referência<input name="providerReference" /></label>
                <label>Bruto<input name="reportedGross" defaultValue={moneyInput(payment.amountCents)} inputMode="decimal" required /></label>
                <label>Taxa<input name="fee" defaultValue="0,00" inputMode="decimal" required /></label>
                <label>Líquido<input name="net" defaultValue={moneyInput(payment.amountCents)} inputMode="decimal" required /></label>
                <label className="wide">Observação<input name="note" /></label>
                <button className="button ghost" type="submit" disabled={busyId === payment.id}>Registrar reconciliação</button>
              </form>
            </details>

            <details className="payment-admin-action danger-zone">
              <summary>Registrar estorno confirmado</summary>
              <form className="payment-finance-form" onSubmit={(event) => void refund(event, payment)}>
                <label>Valor<input name="amount" defaultValue={moneyInput(remaining)} inputMode="decimal" required /></label>
                <label>Referência do estorno<input name="providerReference" required /></label>
                <label className="wide">Observação<input name="note" /></label>
                <button className="button ghost" type="submit" disabled={busyId === payment.id}>Registrar estorno</button>
              </form>
            </details>
          </>}
        </article>;
      })}
    </div>
  </section>;
}
