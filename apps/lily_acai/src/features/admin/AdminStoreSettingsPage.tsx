import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, lilyAdminJson, parseResponse, type AuthPayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";

type StoreSettings = {
  instagramHandle: string;
  whatsappPhone: string;
  publicAddressText: string | null;
  loyaltyOrderCentsPerPoint: number;
  loyaltyCampaignBonusPoints: number;
  loyaltyCouponBonusPoints: number;
};

async function getStoreSettings() {
  const response = await fetch("/api/v1/lily/admin/store-settings", { credentials: "same-origin" });
  return parseResponse<StoreSettings>(response);
}

export function AdminStoreSettingsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const current = await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
    setSession(current);
    setSettings(await getStoreSettings());
  }

  useEffect(() => {
    refresh()
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as configurações da loja."))
      .finally(() => setLoaded(true));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await lilyAdminJson("store-settings", "PATCH", session.csrfToken, {
        instagramHandle: String(form.get("instagramHandle") || "").trim(),
        whatsappPhone: String(form.get("whatsappPhone") || "").trim(),
        publicAddressText: String(form.get("publicAddressText") || "").trim() || null,
        loyaltyOrderCentsPerPoint: Math.max(1, Number(form.get("loyaltyOrderCentsPerPoint") || 100)),
        loyaltyCampaignBonusPoints: Math.max(0, Number(form.get("loyaltyCampaignBonusPoints") || 0)),
        loyaltyCouponBonusPoints: Math.max(0, Number(form.get("loyaltyCouponBonusPoints") || 0))
      });
      await refresh();
      setMessage("Configurações da loja salvas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar as configurações da loja.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando configurações da loja"/></section>;
  if (!session || !settings) return <section className="admin-state">
    <span className="eyebrow">CookLily · administração</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error || "Entre com uma conta da equipe para administrar a loja."}</p>
    <Link className="button primary" to="/entrar?next=/painel/configuracoes">Entrar</Link>
  </section>;

  return <section className="admin-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · administração</span>
        <h1>Configurações da loja</h1>
        <p>Gerencie canais públicos, endereço exibido aos clientes e regras de fidelidade. Entrega e retirada ficam em uma página separada.</p>
      </div>
      <div className="admin-actions">
        <Link className="button ghost" to="/painel">Resumo</Link>
        <Link className="button ghost" to="/painel/entrega">Entrega e retirada</Link>
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}

    <form className="fulfillment-admin" onSubmit={save}>
      <section className="checkout-section">
        <h2>Canais públicos</h2>
        <p>Esses dados alimentam header, rodapé e contatos públicos sem alterar código.</p>
        <div className="admin-form-grid">
          <label>Instagram<input name="instagramHandle" defaultValue={settings.instagramHandle} placeholder="acai._lily" required /></label>
          <label>WhatsApp<input name="whatsappPhone" defaultValue={settings.whatsappPhone} placeholder="+5567999999999" required /></label>
          <label className="admin-span">Endereço público<input name="publicAddressText" defaultValue={settings.publicAddressText ?? ""} placeholder="Endereço exibido ao cliente" /></label>
        </div>
      </section>

      <section className="checkout-section">
        <h2>Ranking e pontos</h2>
        <p>Compras só pontuam quando o pedido estiver pago/concluído. Campanhas usam a atribuição <code>la_campaign</code>; cupons usam o ledger quando houver resgate validado.</p>
        <div className="admin-form-grid">
          <label>Centavos por ponto<input name="loyaltyOrderCentsPerPoint" type="number" min="1" step="1" defaultValue={settings.loyaltyOrderCentsPerPoint} required /></label>
          <label>Bônus por campanha<input name="loyaltyCampaignBonusPoints" type="number" min="0" step="1" defaultValue={settings.loyaltyCampaignBonusPoints} required /></label>
          <label>Bônus por cupom<input name="loyaltyCouponBonusPoints" type="number" min="0" step="1" defaultValue={settings.loyaltyCouponBonusPoints} required /></label>
        </div>
      </section>

      <button className="button primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar configurações da loja"}</button>
    </form>
  </section>;
}
