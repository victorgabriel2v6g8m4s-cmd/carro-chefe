import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  getAdminPaymentChoiceSettings,
  saveAdminPaymentChoiceSettings,
  type AdminPaymentChoiceSettings,
  type LilyCheckoutPaymentMethod,
  type LilyPaymentMethodRule
} from "../payments/payment-choice-api";

function moneyInput(cents: number | null) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : null;
}

function percentageInput(bps: number) {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function parsePercentage(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10000, Math.round(parsed * 100))) : 0;
}

function methodLabel(method: LilyCheckoutPaymentMethod) {
  return method === "pix" ? "Pix" : method === "credit_card" ? "Cartão de crédito" : "Cartão de débito";
}

function providerLabel(provider: string) {
  return provider === "cooklily_pix" ? "Pix CookLily"
    : provider === "mercado_pago" ? "Mercado Pago"
    : provider === "manual" ? "Pix manual"
    : provider;
}

function MethodRuleEditor({ rule, disabled }: { rule: LilyPaymentMethodRule; disabled: boolean }) {
  const prefix = `method.${rule.method}`;
  return <fieldset className="checkout-section payment-method-rule">
    <legend>{methodLabel(rule.method)}</legend>
    <label className="check">
      <input name={`${prefix}.enabled`} type="checkbox" defaultChecked={rule.enabled} disabled={disabled} />
      <span>Disponível para o cliente quando houver provider pronto</span>
    </label>
    <label>Tipo de desconto
      <select name={`${prefix}.discountType`} defaultValue={rule.discountType} disabled={disabled}>
        <option value="none">Sem desconto</option>
        <option value="percentage">Percentual</option>
        <option value="fixed">Valor fixo</option>
      </select>
    </label>
    <label>Valor do desconto
      <input
        name={`${prefix}.discountValue`}
        inputMode="decimal"
        defaultValue={rule.discountType === "percentage" ? percentageInput(rule.discountValue) : moneyInput(rule.discountValue)}
        disabled={disabled}
      />
      <small>Percentual: informe 5 para 5%. Valor fixo: informe em reais, por exemplo 2,50.</small>
    </label>
    <label>Teto do desconto <span>opcional</span>
      <input name={`${prefix}.maxDiscount`} inputMode="decimal" defaultValue={moneyInput(rule.maxDiscountCents)} disabled={disabled} />
    </label>
    <label>Pedido mínimo para receber desconto
      <input name={`${prefix}.minimumOrder`} inputMode="decimal" defaultValue={moneyInput(rule.minimumOrderCents)} disabled={disabled} />
    </label>
    <small>O desconto é aplicado somente à parte de produtos do pedido. Taxa de entrega não recebe desconto.</small>
  </fieldset>;
}

export function AdminPaymentMethodsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [settings, setSettings] = useState<AdminPaymentChoiceSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const current = await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
    const next = await getAdminPaymentChoiceSettings();
    setSession(current);
    setSettings(next);
  }

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível abrir pagamentos."))
      .finally(() => setLoaded(true));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !settings || session.user.role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const methods = settings.methods.map((rule) => {
      const prefix = `method.${rule.method}`;
      const discountType = String(form.get(`${prefix}.discountType`) ?? "none") as LilyPaymentMethodRule["discountType"];
      const discountValue = discountType === "percentage"
        ? parsePercentage(form.get(`${prefix}.discountValue`))
        : discountType === "fixed"
          ? parseMoney(form.get(`${prefix}.discountValue`)) ?? 0
          : 0;
      return {
        method: rule.method,
        enabled: form.get(`${prefix}.enabled`) === "on",
        discountType,
        discountValue,
        maxDiscountCents: parseMoney(form.get(`${prefix}.maxDiscount`)),
        minimumOrderCents: parseMoney(form.get(`${prefix}.minimumOrder`)) ?? 0
      } satisfies LilyPaymentMethodRule;
    });

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await saveAdminPaymentChoiceSettings({
        paymentsEnabled: form.get("paymentsEnabled") === "on",
        manualPixEnabled: form.get("manualPixEnabled") === "on",
        manualPixInstructions: String(form.get("manualPixInstructions") || "") || null,
        mercadoPagoPixEnabled: form.get("mercadoPagoPixEnabled") === "on",
        mercadoPagoCardEnabled: form.get("mercadoPagoCardEnabled") === "on",
        methods
      }, session.csrfToken);
      setSettings(updated);
      setMessage("Formas de pagamento e descontos atualizados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a configuração.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <section className="admin-state"><h1>Carregando configuração financeira...</h1></section>;
  if (!session || !settings) return <section className="admin-state">
    <span className="eyebrow">CookLily · pagamentos</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error || "Entre com uma conta da equipe."}</p>
    <Link className="button primary" to="/entrar?next=/pagamento/configuracoes">Entrar</Link>
  </section>;

  const isAdmin = session.user.role === "admin";
  return <section className="admin-page payments-admin-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · motor de pagamento</span>
        <h1>Formas de pagamento e descontos</h1>
        <p>O cliente escolhe Pix, crédito ou débito. O Pix segue a ordem CookLily → Mercado Pago → contingência manual.</p>
      </div>
      <Link className="button ghost" to="/painel/pagamentos">Reconciliação</Link>
    </div>

    {!isAdmin && <div className="operation-warning"><strong>Somente leitura.</strong><p>Apenas admin altera regras financeiras.</p></div>}

    <div className="admin-kpis">
      <article><strong>{settings.paymentsEnabled ? "ON" : "OFF"}</strong><span>pagamentos</span></article>
      <article><strong>{settings.readiness.pixFallbackChain.length}</strong><span>rotas Pix prontas</span></article>
      <article><strong>{settings.readiness.mercadoPago.cardReady ? "OK" : "—"}</strong><span>cartões Mercado Pago</span></article>
    </div>

    <form className="checkout-section payment-settings-form" onSubmit={save}>
      <label className="check">
        <input name="paymentsEnabled" type="checkbox" defaultChecked={settings.paymentsEnabled} disabled={!isAdmin} />
        <span>Pagamentos habilitados</span>
      </label>

      <section className="optional-box">
        <strong>Ordem efetiva do Pix</strong>
        <p>{settings.readiness.pixFallbackChain.length
          ? settings.readiness.pixFallbackChain.map(providerLabel).join(" → ")
          : "Nenhuma rota Pix pronta."}</p>
        <small>Fallback automático só ocorre quando é seguro. Timeout após chamar um provider externo falha fechado para evitar cobrança duplicada.</small>
      </section>

      <fieldset className="checkout-section">
        <legend>Providers Pix</legend>
        <p>Pix CookLily é usado automaticamente quando chave, nome e cidade estão configurados no servidor.</p>
        <label className="check">
          <input name="mercadoPagoPixEnabled" type="checkbox" defaultChecked={settings.mercadoPagoPixEnabled} disabled={!isAdmin} />
          <span>Permitir Mercado Pago como fallback Pix {settings.readiness.mercadoPago.pixReady ? "· pronto" : "· aguardando credenciais"}</span>
        </label>
        <label className="check">
          <input name="manualPixEnabled" type="checkbox" defaultChecked={settings.manualPixEnabled} disabled={!isAdmin} />
          <span>Permitir Pix manual como último fallback</span>
        </label>
        <label>Instruções da contingência manual
          <textarea name="manualPixInstructions" rows={4} defaultValue={settings.manualPixInstructions ?? ""} disabled={!isAdmin} />
        </label>
      </fieldset>

      <fieldset className="checkout-section">
        <legend>Cartões</legend>
        <label className="check">
          <input name="mercadoPagoCardEnabled" type="checkbox" defaultChecked={settings.mercadoPagoCardEnabled} disabled={!isAdmin} />
          <span>Crédito e débito via Mercado Pago {settings.readiness.mercadoPago.cardReady ? "· pronto" : "· aguardando credenciais"}</span>
        </label>
      </fieldset>

      {settings.methods.map((rule) => <MethodRuleEditor key={rule.method} rule={rule} disabled={!isAdmin} />)}

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}
      {isAdmin && <button className="button primary" disabled={busy}>{busy ? "Salvando..." : "Salvar regras"}</button>}
    </form>
  </section>;
}
