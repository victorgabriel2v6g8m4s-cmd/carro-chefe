import { useEffect, useState, type FormEvent } from "react";
import { getLilySession, lilyAdminJson, parseResponse, type AuthPayload } from "../../api";

type BusinessHour = { dayOfWeek: number; opensAt: string; closesAt: string };
type Zone = {
  id: string;
  name: string;
  status: string;
  feeCents: number;
  minimumOrderCents: number;
  neighborhoods: string[];
  postalCodePrefixes: string[];
  sortOrder: number;
};

type AdminFulfillmentPayload = {
  settings: {
    ordersEnabled: boolean;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    minimumOrderCents: number;
    deliveryStrategy: "flat" | "zone";
    flatDeliveryFeeCents: number;
    pickupAddressText: string | null;
    pickupInstructions: string | null;
    instagramHandle: string;
    whatsappPhone: string;
    publicAddressText: string | null;
    loyaltyOrderCentsPerPoint: number;
    loyaltyCampaignBonusPoints: number;
    loyaltyCouponBonusPoints: number;
    timezone: string;
    businessHours: BusinessHour[];
  };
  zones: Zone[];
};

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function moneyInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parseMoney(value: string) {
  const parsed = Number(value.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

async function getAdminFulfillment() {
  const response = await fetch("/api/v1/lily/admin/fulfillment", { credentials: "same-origin" });
  return parseResponse<AdminFulfillmentPayload>(response);
}

export function AdminFulfillmentPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<AdminFulfillmentPayload | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const current = await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
    setSession(current);
    setData(await getAdminFulfillment());
  }

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as configurações."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="admin-state"><h1>Carregando configurações...</h1></section>;
  if (!session || !data) return <section className="admin-state"><span className="eyebrow">CookLily</span><h1>Acesso staff necessário.</h1><p>{error}</p><a className="button primary" href={import.meta.env.BASE_URL + "entrar"}>Entrar</a></section>;

  const csrfToken = session.csrfToken;
  const settings = data.settings;
  const byDay = new Map(settings.businessHours.map((hour) => [hour.dayOfWeek, hour]));

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSaved("");
    const businessHours: BusinessHour[] = [];
    for (let day = 0; day < 7; day += 1) {
      if (form.get("day-" + day) !== "on") continue;
      businessHours.push({
        dayOfWeek: day,
        opensAt: String(form.get("opens-" + day) || "00:00"),
        closesAt: String(form.get("closes-" + day) || "23:59")
      });
    }
    try {
      await lilyAdminJson("fulfillment", "PATCH", csrfToken, {
        ordersEnabled: form.get("ordersEnabled") === "on",
        pickupEnabled: form.get("pickupEnabled") === "on",
        deliveryEnabled: form.get("deliveryEnabled") === "on",
        minimumOrderCents: parseMoney(String(form.get("minimumOrder") || "0")),
        deliveryStrategy: String(form.get("deliveryStrategy")),
        flatDeliveryFeeCents: parseMoney(String(form.get("flatFee") || "0")),
        pickupAddressText: String(form.get("pickupAddress") || "") || null,
        pickupInstructions: String(form.get("pickupInstructions") || "") || null,
        instagramHandle: String(form.get("instagramHandle") || "").trim(),
        whatsappPhone: String(form.get("whatsappPhone") || "").trim(),
        publicAddressText: String(form.get("publicAddressText") || "") || null,
        loyaltyOrderCentsPerPoint: Math.max(1, Number(form.get("loyaltyOrderCentsPerPoint") || 100)),
        loyaltyCampaignBonusPoints: Math.max(0, Number(form.get("loyaltyCampaignBonusPoints") || 0)),
        loyaltyCouponBonusPoints: Math.max(0, Number(form.get("loyaltyCouponBonusPoints") || 0)),
        businessHours,
        timezone: "America/Campo_Grande"
      });
      setSaved("Configurações salvas.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar configurações.");
    }
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      await lilyAdminJson("delivery-zones", "POST", csrfToken, {
        name: String(form.get("name")),
        status: "active",
        feeCents: parseMoney(String(form.get("fee") || "0")),
        minimumOrderCents: parseMoney(String(form.get("minimum") || "0")),
        neighborhoods: String(form.get("neighborhoods") || "").split(",").map((value) => value.trim()).filter(Boolean),
        postalCodePrefixes: String(form.get("postalPrefixes") || "").split(",").map((value) => value.trim()).filter(Boolean),
        sortOrder: 100
      });
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar região.");
    }
  }

  return <section className="admin-page wide">
    <div className="admin-heading">
      <div><span className="eyebrow">Entrega 06</span><h1>Entrega e retirada</h1><p>Pedidos começam desabilitados. Abra a operação apenas depois de configurar horários e regras reais.</p></div>
      <div className="admin-actions"><a className="button ghost" href={import.meta.env.BASE_URL + "painel"}>Resumo</a><a className="button ghost" href={import.meta.env.BASE_URL + "checkout"} target="_blank" rel="noreferrer">Preview checkout</a></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {saved && <p className="success" role="status">{saved}</p>}

    <form className="fulfillment-admin" onSubmit={saveSettings}>
      <section className="checkout-section">
        <h2>Operação</h2>
        <div className="admin-check-grid">
          <label><input name="ordersEnabled" type="checkbox" defaultChecked={settings.ordersEnabled} /> Pedidos online ativos</label>
          <label><input name="pickupEnabled" type="checkbox" defaultChecked={settings.pickupEnabled} /> Retirada</label>
          <label><input name="deliveryEnabled" type="checkbox" defaultChecked={settings.deliveryEnabled} /> Entrega</label>
        </div>
        <div className="admin-form-grid">
          <label>Pedido mínimo<input name="minimumOrder" defaultValue={moneyInput(settings.minimumOrderCents)} /></label>
          <label>Estratégia de entrega<select name="deliveryStrategy" defaultValue={settings.deliveryStrategy}><option value="flat">Taxa fixa</option><option value="zone">Por região</option></select></label>
          <label>Taxa fixa<input name="flatFee" defaultValue={moneyInput(settings.flatDeliveryFeeCents)} /></label>
          <label className="admin-span">Endereço de retirada<input name="pickupAddress" defaultValue={settings.pickupAddressText ?? ""} /></label>
          <label className="admin-span">Instruções de retirada<textarea name="pickupInstructions" rows={2} defaultValue={settings.pickupInstructions ?? ""} /></label>
        </div>
      </section>

      <section className="checkout-section">
        <h2>Canais públicos</h2>
        <p>Esses dados alimentam header, rodapé, WhatsApp, Instagram e endereço público sem alterar código.</p>
        <div className="admin-form-grid">
          <label>Instagram<input name="instagramHandle" defaultValue={settings.instagramHandle} placeholder="acai._lily" /></label>
          <label>WhatsApp<input name="whatsappPhone" defaultValue={settings.whatsappPhone} placeholder="+5567999999999" /></label>
          <label className="admin-span">Endereço público<input name="publicAddressText" defaultValue={settings.publicAddressText ?? ""} placeholder="Endereço exibido ao cliente" /></label>
        </div>
      </section>

      <section className="checkout-section">
        <h2>Ranking e pontos</h2>
        <p>Compras só pontuam quando o pedido estiver pago/concluído. Campanhas usam o tracking la_campaign. Cupons usam o ledger de fidelidade quando integrados.</p>
        <div className="admin-form-grid">
          <label>Centavos por ponto<input name="loyaltyOrderCentsPerPoint" type="number" min="1" step="1" defaultValue={settings.loyaltyOrderCentsPerPoint} /></label>
          <label>Bônus por campanha<input name="loyaltyCampaignBonusPoints" type="number" min="0" step="1" defaultValue={settings.loyaltyCampaignBonusPoints} /></label>
          <label>Bônus por cupom<input name="loyaltyCouponBonusPoints" type="number" min="0" step="1" defaultValue={settings.loyaltyCouponBonusPoints} /></label>
        </div>
      </section>

      <section className="checkout-section">
        <h2>Horários</h2>
        <p>Fuso fixo da operação: America/Campo_Grande.</p>
        <div className="hours-grid">
          {days.map((name, day) => {
            const current = byDay.get(day);
            return <div key={day} className="hours-row">
              <label><input name={"day-" + day} type="checkbox" defaultChecked={Boolean(current)} /> {name}</label>
              <input name={"opens-" + day} type="time" defaultValue={current?.opensAt ?? "18:00"} aria-label={"Abertura " + name} />
              <input name={"closes-" + day} type="time" defaultValue={current?.closesAt ?? "23:00"} aria-label={"Fechamento " + name} />
            </div>;
          })}
        </div>
      </section>
      <button className="button primary" type="submit">Salvar operação</button>
    </form>

    <section className="checkout-section admin-zones">
      <h2>Regiões de entrega</h2>
      <p>Usadas somente quando a estratégia estiver em “Por região”. Bairro ou prefixo de CEP pode liberar uma região.</p>
      <div className="zone-list">
        {data.zones.map((zone) => <article key={zone.id}>
          <strong>{zone.name}</strong><span>{zone.status}</span>
          <small>Taxa R$ {moneyInput(zone.feeCents)} · mínimo R$ {moneyInput(zone.minimumOrderCents)}</small>
          <small>Bairros: {zone.neighborhoods.join(", ") || "nenhum"}</small>
          <small>CEPs: {zone.postalCodePrefixes.join(", ") || "nenhum"}</small>
        </article>)}
      </div>
      <form className="admin-form-grid" onSubmit={createZone}>
        <label>Nome da região<input name="name" required /></label>
        <label>Taxa<input name="fee" defaultValue="0,00" required /></label>
        <label>Pedido mínimo<input name="minimum" defaultValue="0,00" /></label>
        <label className="admin-span">Bairros, separados por vírgula<input name="neighborhoods" /></label>
        <label className="admin-span">Prefixos de CEP, separados por vírgula<input name="postalPrefixes" placeholder="79002, 79003" /></label>
        <button className="button primary" type="submit">Criar região</button>
      </form>
    </section>
  </section>;
}
