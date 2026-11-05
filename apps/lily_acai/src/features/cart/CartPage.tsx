import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "../../router";
import { useCart } from "./CartContext";
import type { CartItem } from "./types";
import { getOrderEditContext, type LilyOrderEditItem } from "../orders/api";
import { consumeOrderAccessLink, parseOrderAccessLink, rememberOrderEdit } from "../orders/guest-token";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CartPage() {
  const cart = useCart();
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get("editar") ?? "";
  const editLink = useMemo(() => parseOrderAccessLink(editParam), [editParam]);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [editNotice, setEditNotice] = useState("");

  useEffect(() => {
    if (!editLink || editBusy) return;
    if (cart.items.length && !window.confirm("Substituir o carrinho atual pelos itens deste pedido pendente?")) return;
    let active = true;
    setEditBusy(true);
    setEditError("");
    void getOrderEditContext(editLink.orderId, editLink.token).then((context) => {
      if (!active) return;
      cart.replaceItems(context.items.map((item, index) => editCartItem(context.orderId, item, index)));
      rememberOrderEdit(context.orderId, editLink.token);
      consumeOrderAccessLink(context.orderId, editLink.token, "editar");
      setEditNotice(`Pedido ${context.orderNumber} carregado para edição.`);
    }).catch((cause) => {
      if (active) setEditError(cause instanceof Error ? cause.message : "Não foi possível carregar o pedido para edição.");
    }).finally(() => { if (active) setEditBusy(false); });
    return () => { active = false; };
  }, [editLink?.token]);

  if (editBusy) return <section className="checkout-page" role="status">Carregando pedido para edição…</section>;
  if (!cart.items.length) {
    return <section className="checkout-page empty-state">
      <span className="eyebrow">Carrinho</span>
      <h1>Seu carrinho está vazio.</h1>
      <p>Escolha um produto no cardápio para começar.</p>
      {editError && <p role="alert">{editError}</p>}
      <Link className="button primary" to="/cardapio">Ver cardápio</Link>
    </section>;
  }

  return <section className="checkout-page">
    <div className="checkout-heading">
      <div><span className="eyebrow">Carrinho CookLily</span><h1>Revise suas escolhas.</h1></div>
      <Link className="button ghost" to="/cardapio">Adicionar mais</Link>
    </div>
    {editNotice && <p className="notice" role="status">{editNotice}</p>}
    {editError && <p role="alert">{editError}</p>}
    <div className="cart-layout">
      <div className="cart-items">
        {cart.items.map((item) => <article className="cart-item" key={item.id}>
          <div>
            <strong>{item.productName}</strong>
            <span>{item.kind === "combo" ? "Combo" : item.variantName === "Preço fixo" ? null : item.variantName}</span>
            {item.kind === "combo" && item.comboSelections?.length ? <small>Inclui: {item.comboSelections.map((selection) => selection.productName).join(" + ")}</small> : null}
            {item.flavors.length > 0 && <small>{item.flavors.map((flavor) => flavor.name).join(" + ")}</small>}
            {item.addons.length > 0 && <small>Adicionais: {item.addons.map((addon) => `${addon.name} ×${addon.quantity}`).join(", ")}</small>}
          </div>
          <div className="cart-item-actions">
            <strong>{money(item.unitPriceCents * item.quantity)}</strong>
            <div className="stepper">
              <button type="button" onClick={() => cart.setQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => cart.setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= 20}>+</button>
            </div>
            <button className="text-button" type="button" onClick={() => cart.removeItem(item.id)}>Remover</button>
          </div>
          <label className="cart-note">Observação do item
            <textarea value={item.note} maxLength={300} rows={2}
              placeholder="Ex.: sem um ingrediente que já faz parte da receita. Adicionais pagos devem ser escolhidos no configurador."
              onChange={(event) => cart.setNote(item.id, event.target.value)} />
          </label>
        </article>)}
      </div>
      <aside className="cart-summary">
        <span>Subtotal exibido</span>
        <strong>{money(cart.snapshotSubtotalCents)}</strong>
        <small>O servidor recalcula produtos, adicionais, disponibilidade, pedido mínimo e entrega no checkout.</small>
        <Link className="button primary" to="/checkout">Ir para checkout</Link>
      </aside>
    </div>
  </section>;
}

function editCartItem(orderId: string, item: LilyOrderEditItem, index: number): CartItem {
  const configuration = item.configuration ?? {};
  const common = {
    id: `${orderId}-edit-${index}`,
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantName: item.variantName,
    sizeMl: item.sizeMl,
    configurationHash: item.configurationHash,
    allergens: item.allergens,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    note: item.note ?? ""
  };
  if (configuration.kind === "combo") {
    const selections = Array.isArray(configuration.selections) ? configuration.selections : [];
    return {
      ...common,
      kind: "combo",
      flavorIds: [], flavors: [],
      comboId: item.productId,
      comboSelections: selections.map((selection: any) => ({
        productId: selection.product.id,
        productName: selection.product.name,
        sizeMl: selection.sizeMl,
        flavorIds: selection.flavors.map((flavor: any) => flavor.id),
        flavors: selection.flavors.map((flavor: any) => ({ id: flavor.id, name: flavor.name })),
        addons: selection.addons.map((addon: any) => ({
          addonId: addon.addonId, name: addon.name, unitPriceCents: addon.unitPriceCents, quantity: addon.quantity
        })),
        configurationHash: selection.configurationHash,
        allergens: selection.allergens
      })),
      addons: item.addons.map((addon) => ({ addonId: addon.addonId, name: addon.name, unitPriceCents: addon.unitPriceCents, quantity: addon.quantity }))
    };
  }
  return {
    ...common,
    kind: "product",
    flavorIds: Array.isArray(configuration.flavorIds) ? configuration.flavorIds : [],
    flavors: item.flavors.map(({ id, name }) => ({ id, name })),
    addons: item.addons.map((addon) => ({ addonId: addon.addonId, name: addon.name, unitPriceCents: addon.unitPriceCents, quantity: addon.quantity }))
  };
}
