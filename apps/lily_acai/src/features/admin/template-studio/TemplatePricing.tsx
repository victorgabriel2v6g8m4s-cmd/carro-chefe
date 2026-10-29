import { useState } from "react";
import { quoteMessages, type PricingConfig } from "./template-pricing";

type Props = { config: PricingConfig; onChange: (config: PricingConfig) => void; onSave: () => void; dirty: boolean; outbound: Array<{ category: string; windowOpen: boolean }>; origin: "business" | "customer"; onOriginChange: (origin: "business" | "customer") => void };
const labels: Array<[keyof PricingConfig["usd"], string]> = [["marketing", "Marketing"], ["utility", "Utilidade"], ["authentication", "Autenticação"], ["service", "Serviço na janela 24h"]];

export function TemplatePricing({ config, onChange, onSave, dirty, outbound, origin, onOriginChange }: Props) {
  const [open, setOpen] = useState(false);
  const quote = quoteMessages(outbound, config);
  const totalUsd = quote.usd;
  const totalBrl = quote.brl;
  const serviceCount = outbound.filter((message) => message.windowOpen && message.category === "service").length;
  const freeRemaining = Math.max(0, config.freeServiceMessages - Math.min(serviceCount, config.freeServiceMessages));
  const messageCount = outbound.length;
  function updateRate(key: keyof PricingConfig["usd"], value: number) { onChange({ ...config, usd: { ...config.usd, [key]: Math.max(0, value) } }); }
  return <section className="template-pricing">
    <header><div><strong>Estimativa da Meta</strong><small>{messageCount} mensagens simuladas · sem cobrança real</small></div><strong>US$ {totalUsd.toFixed(4)} · R$ {totalBrl.toFixed(4)}</strong></header>
    <label>Quem iniciou a conversa<select value={origin} onChange={(event) => onOriginChange(event.target.value as "business" | "customer")}><option value="business">CookLily · mensagem iniciada pela empresa</option><option value="customer">Cliente · dentro da janela de 24 horas</option></select></label>
    <p>{origin === "customer" ? "A janela de 24h começa aberta. A tarifa de cada mensagem depende da categoria: templates de marketing, utilidade e autenticação são cotados; mensagens de serviço usam a franquia mensal configurada." : "A janela começa fechada. O template da empresa é cotado por categoria; após a resposta do cliente, a janela de 24h abre para mensagens de serviço."}</p>
    {quote.blockedService > 0 && <p className="template-pricing-warning" role="alert">{quote.blockedService} mensagem(ns) de serviço fora da janela de 24h não podem ser enviadas. Use um template aprovado.</p>}
    <div className="template-pricing-breakdown" aria-label="Detalhamento por categoria">{labels.map(([key, label]) => { const item = quote.byCategory[key]; return item.count ? <div key={key}><span>{label} · {item.count}</span><strong>US$ {item.usd.toFixed(4)} · R$ {(item.usd * config.usdToBrl).toFixed(4)}</strong>{item.free > 0 && <small>{item.free} gratuita(s) pela franquia</small>}{item.blocked > 0 && <small>Bloqueada(s) fora da janela</small>}</div> : null; })}</div>
    {serviceCount > 0 && <small>Franquia configurada restante após esta simulação: {freeRemaining.toLocaleString("pt-BR")} mensagem(ns).</small>}
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary>Configurar cotações e câmbio</summary>
      <label>Câmbio USD → BRL<input type="number" min="0" step="0.0001" value={config.usdToBrl} onChange={(event) => onChange({ ...config, usdToBrl: Number(event.target.value) })} /></label>
      <div className="template-pricing-rates">{labels.map(([key, label]) => <label key={key}>{label} (USD/mensagem)<input type="number" min="0" step="0.0001" value={config.usd[key]} onChange={(event) => updateRate(key, Number(event.target.value))} /><small>≈ R$ {(config.usd[key] * config.usdToBrl).toFixed(4)}</small></label>)}</div>
      <label>Franquia grátis de serviço restante neste mês<input type="number" min="0" step="1" value={config.freeServiceMessages} onChange={(event) => onChange({ ...config, freeServiceMessages: Math.max(0, Number(event.target.value)) })} /></label>
      <label>Vigência das tarifas<input type="date" value={config.effectiveDate} onChange={(event) => onChange({ ...config, effectiveDate: event.target.value })} /></label>
      <label>Fonte / nota<input value={config.source} onChange={(event) => onChange({ ...config, source: event.target.value })} /></label>
      <button type="button" className="button primary" onClick={onSave} disabled={!dirty}>Salvar tarifas e câmbio</button>
    </details>
    <small>Modelo simplificado: tarifa varia por país do destinatário, categoria, tiers e volume. Esta configuração não é fatura Meta.</small>
  </section>;
}
