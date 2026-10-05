import { Link } from "react-router-dom";
import type { LilyChoicePayment, LilyPaymentOption } from "./payment-choice-api";

export function paymentMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function paymentMethodHint(option: LilyPaymentOption) {
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

export function PaymentPriceSummary({ option }: { option: LilyPaymentOption }) {
  const price = option.pricing;
  return <div className="payment-price-summary" aria-live="polite">
    {price.discountCents > 0 && <>
      <span>Valor do pedido <strong>{paymentMoney(price.baseAmountCents)}</strong></span>
      <span className="state-live">Desconto desta forma de pagamento <strong>- {paymentMoney(price.discountCents)}</strong></span>
    </>}
    <span>Total a pagar <strong>{paymentMoney(price.amountCents)}</strong></span>
    {price.deliveryFeeCents > 0 && price.discountCents > 0 && <small>O desconto não reduz a taxa de entrega.</small>}
  </div>;
}

export function PaymentChoiceResult(props: {
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
      <h2>{paymentMoney(payment.amountCents)}</h2>
      {payment.pricing.discountCents > 0 && <p>Você economizou {paymentMoney(payment.pricing.discountCents)} com esta forma de pagamento.</p>}
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
    <h2>{paymentMoney(payment.amountCents)}</h2>
    {payment.pricing.discountCents > 0 && <p>Desconto aplicado: {paymentMoney(payment.pricing.discountCents)}.</p>}
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
