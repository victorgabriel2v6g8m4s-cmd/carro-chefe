import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { attributionForApi, readStoredCookLilyAttribution } from "../../tracking";
import { useCart } from "../cart/CartContext";
import {
  createOrder,
  createSavedAddress,
  getFulfillmentSettings,
  getSavedAddresses,
  quoteOrder,
  type FulfillmentSettings,
  type LilyAddressInput,
  type LilyOrder,
  type OrderQuote
} from "../orders/api";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const emptyAddress: LilyAddressInput = {
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "MS",
  reference: ""
};

export function CheckoutPage() {
  const cart = useCart();
  const [settings, setSettings] = useState<FulfillmentSettings | null>(null);
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Array<LilyAddressInput & { id: string; isDefault: boolean }>>([]);
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState<LilyAddressInput>(emptyAddress);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [phone, setPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [created, setCreated] = useState<LilyOrder | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getFulfillmentSettings().then((value) => {
      setSettings(value);
      if (!value.pickupEnabled && value.deliveryEnabled) setFulfillmentType("delivery");
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar entrega e retirada."));

    getLilySession().then(async (current) => {
      setSession(current);
      setPhone(current.user.phone);
      try {
        const saved = await getSavedAddresses();
        setSavedAddresses(saved.addresses);
        const preferred = saved.addresses.find((item) => item.isDefault) ?? saved.addresses[0];
        if (preferred) {
          setAddress(preferred);
          setSelectedAddressId(preferred.id);
        }
      } catch {
        setSavedAddresses([]);
      }
    }).catch(() => setSession(null));
  }, []);

  const cartSignature = useMemo(() => JSON.stringify(cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    note: item.note,
    configurationHash: item.configurationHash
  }))), [cart.items]);

  useEffect(() => {
    setQuote(null);
    setIdempotencyKey(null);
  }, [fulfillmentType, address.postalCode, address.street, address.number, address.complement,
    address.neighborhood, address.city, address.state, address.reference, cartSignature]);

  function deliveryAddress() {
    return fulfillmentType === "delivery" ? address : undefined;
  }

  async function calculate() {
    if (!cart.items.length) return null;
    setBusy(true);
    setError("");
    try {
      const result = await quoteOrder({
        fulfillmentType,
        address: deliveryAddress(),
        items: cart.items
      });
      setQuote(result);
      return result;
    } catch (cause) {
      setQuote(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível calcular o pedido.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cart.items.length) return;
    setBusy(true);
    setError("");
    try {
      const freshQuote = await quoteOrder({
        fulfillmentType,
        address: deliveryAddress(),
        items: cart.items
      });
      setQuote(freshQuote);
      const key = idempotencyKey ?? `cooklily:${crypto.randomUUID()}`;
      setIdempotencyKey(key);
      const order = await createOrder({
        phone,
        fulfillmentType,
        address: deliveryAddress(),
        customerNote,
        items: cart.items,
        quote: freshQuote,
        attribution: attributionForApi(readStoredCookLilyAttribution()),
        session,
        idempotencyKey: key
      });
      setCreated(order);

      if (saveAddress && session && fulfillmentType === "delivery" && !selectedAddressId) {
        try {
          const saved = await createSavedAddress(address, session.csrfToken, savedAddresses.length === 0);
          setSavedAddresses((current) => [...current, saved]);
          setSelectedAddressId(saved.id);
        } catch {
          // O pedido já foi criado. Falha ao salvar endereço não deve duplicar nem invalidar o pedido.
        }
      }

      cart.clear();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  function chooseSaved(id: string) {
    setSelectedAddressId(id);
    const found = savedAddresses.find((item) => item.id === id);
    if (found) setAddress(found);
  }

  if (created) {
    return <section className="checkout-page order-success">
      <span className="eyebrow">Pedido criado</span>
      <h1>{created.orderNumber}</h1>
      <p>O pedido foi registrado com total de <strong>{money(created.grandTotalCents)}</strong>.</p>
      <div className="payment-pending-card">
        <strong>Aguardando pagamento</strong>
        <p>A Entrega 06 não aprova pagamento. A integração e reconciliação financeira serão habilitadas na Entrega 07.</p>
      </div>
      {session && <Link className="button primary" to={`/pedidos/${created.id}`}>Ver pedido</Link>}
      {!session && <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>}
    </section>;
  }

  if (!cart.items.length) {
    return <section className="checkout-page empty-state">
      <span className="eyebrow">Checkout</span>
      <h1>Seu carrinho está vazio.</h1>
      <Link className="button primary" to="/cardapio">Ver cardápio</Link>
    </section>;
  }

  return <section className="checkout-page">
    <div className="checkout-heading">
      <div><span className="eyebrow">Checkout CookLily</span><h1>Entrega ou retirada.</h1><p>O total é sempre recalculado no servidor antes de criar o pedido.</p></div>
      <Link className="button ghost" to="/carrinho">Voltar ao carrinho</Link>
    </div>

    {settings && (!settings.ordersEnabled || !settings.openNow) && <div className="operation-warning">
      <strong>Pedidos online indisponíveis agora.</strong>
      <p>{!settings.ordersEnabled ? "A operação ainda não foi habilitada pela equipe." : "Estamos fora do horário configurado para pedidos."}</p>
    </div>}

    <form className="checkout-layout" onSubmit={submit}>
      <div className="checkout-form">
        <fieldset className="checkout-section">
          <legend>Como você quer receber?</legend>
          <div className="fulfillment-options">
            <label className={fulfillmentType === "pickup" ? "selected" : ""}>
              <input type="radio" name="fulfillment" value="pickup" checked={fulfillmentType === "pickup"}
                disabled={!settings?.pickupEnabled} onChange={() => setFulfillmentType("pickup")} />
              <strong>Retirada</strong><small>{settings?.pickupAddressText || "Endereço será informado pela equipe."}</small>
            </label>
            <label className={fulfillmentType === "delivery" ? "selected" : ""}>
              <input type="radio" name="fulfillment" value="delivery" checked={fulfillmentType === "delivery"}
                disabled={!settings?.deliveryEnabled} onChange={() => setFulfillmentType("delivery")} />
              <strong>Entrega</strong><small>Taxa e disponibilidade são calculadas pelo servidor.</small>
            </label>
          </div>
        </fieldset>

        <fieldset className="checkout-section">
          <legend>Contato</legend>
          <label>WhatsApp
            <input value={phone} required inputMode="tel" autoComplete="tel"
              onChange={(event) => { setPhone(event.target.value); setIdempotencyKey(null); }} />
          </label>
          {!session && <small>Você pode comprar sem criar conta. O telefone é necessário para identificar e acompanhar o pedido.</small>}
        </fieldset>

        {fulfillmentType === "delivery" && <fieldset className="checkout-section">
          <legend>Endereço de entrega</legend>
          {session && savedAddresses.length > 0 && <label>Endereço salvo
            <select value={selectedAddressId} onChange={(event) => chooseSaved(event.target.value)}>
              <option value="">Usar outro endereço</option>
              {savedAddresses.map((saved) => <option key={saved.id} value={saved.id}>
                {saved.label || `${saved.street}, ${saved.number}`}
              </option>)}
            </select>
          </label>}
          <div className="address-grid">
            <label>CEP<input value={address.postalCode} required inputMode="numeric" onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))} /></label>
            <label className="wide">Rua<input value={address.street} required onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))} /></label>
            <label>Número<input value={address.number} required onChange={(event) => setAddress((current) => ({ ...current, number: event.target.value }))} /></label>
            <label>Complemento<input value={address.complement ?? ""} onChange={(event) => setAddress((current) => ({ ...current, complement: event.target.value }))} /></label>
            <label>Bairro<input value={address.neighborhood} required onChange={(event) => setAddress((current) => ({ ...current, neighborhood: event.target.value }))} /></label>
            <label>Cidade<input value={address.city} required onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} /></label>
            <label>UF<input value={address.state} required maxLength={2} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value.toUpperCase() }))} /></label>
            <label className="wide">Referência<input value={address.reference ?? ""} onChange={(event) => setAddress((current) => ({ ...current, reference: event.target.value }))} /></label>
          </div>
          {session && !selectedAddressId && <label className="check">
            <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
            <span>Salvar este endereço na minha conta depois que o pedido for criado.</span>
          </label>}
        </fieldset>}

        <fieldset className="checkout-section">
          <legend>Observação do pedido</legend>
          <textarea rows={3} maxLength={500} value={customerNote}
            onChange={(event) => { setCustomerNote(event.target.value); setIdempotencyKey(null); }}
            placeholder="Informação operacional para este pedido." />
        </fieldset>

        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <aside className="checkout-summary">
        <h2>Resumo</h2>
        {cart.items.map((item) => <div className="checkout-line" key={item.id}>
          <span>{item.quantity}× {item.productName} · {item.sizeMl} ml</span>
          <strong>{money(item.unitPriceCents * item.quantity)}</strong>
        </div>)}
        {quote ? <>
          <div className="checkout-line"><span>Subtotal validado</span><strong>{money(quote.subtotalCents)}</strong></div>
          <div className="checkout-line"><span>Entrega</span><strong>{money(quote.deliveryFeeCents)}</strong></div>
          <div className="checkout-total"><span>Total</span><strong>{money(quote.grandTotalCents)}</strong></div>
        </> : <p className="price-warning">O valor atual do carrinho é apenas referência. Calcule para validar o total vigente.</p>}
        <button className="button ghost" type="button" disabled={busy || !settings?.ordersEnabled} onClick={() => void calculate()}>
          {busy ? "Calculando..." : "Recalcular total"}
        </button>
        <button className="button primary" type="submit" disabled={busy || !settings?.ordersEnabled || !settings?.openNow}>
          {busy ? "Criando..." : "Criar pedido"}
        </button>
        <small>Nenhum pagamento é aprovado nesta etapa. O pedido nasce como aguardando pagamento.</small>
      </aside>
    </form>
  </section>;
}
