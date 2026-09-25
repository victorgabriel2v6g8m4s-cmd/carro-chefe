import { Link } from "react-router-dom";
import { useCart } from "./CartContext";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CartPage() {
  const cart = useCart();
  if (!cart.items.length) {
    return <section className="checkout-page empty-state">
      <span className="eyebrow">Carrinho</span>
      <h1>Seu carrinho está vazio.</h1>
      <p>Escolha um produto no cardápio para começar.</p>
      <Link className="button primary" to="/cardapio">Ver cardápio</Link>
    </section>;
  }

  return <section className="checkout-page">
    <div className="checkout-heading">
      <div><span className="eyebrow">Carrinho CookLily</span><h1>Revise suas escolhas.</h1></div>
      <Link className="button ghost" to="/cardapio">Adicionar mais</Link>
    </div>
    <div className="cart-layout">
      <div className="cart-items">
        {cart.items.map((item) => <article className="cart-item" key={item.id}>
          <div>
            <strong>{item.productName}</strong>
            <span>{item.kind === "combo" ? "Combo" : `${item.sizeMl} ml · ${item.variantName}`}</span>
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
