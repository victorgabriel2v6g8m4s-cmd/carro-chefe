import { useState, type FormEvent } from "react";
import { renderTemplateMessage, textVariables } from "./template-utils";
import type { TemplateDraft } from "./template-types";

type ChatLine = { id: number; from: "customer" | "business"; text: string };
const seedLines: ChatLine[] = [{ id: 1, from: "business", text: "Sua conversa de teste começa aqui." }];

export function TemplateSimulator({ draft }: { draft: TemplateDraft }) {
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<number, string>>({ 1: "#2048", 2: "pronto para retirada" });
  const [lines, setLines] = useState(seedLines);
  const [nextId, setNextId] = useState(2);
  const variables = textVariables(draft.components);

  function sendCustomerMessage(event: FormEvent) {
    event.preventDefault();
    const customerMessage = message.trim();
    if (!customerMessage) return;
    const reply = renderTemplateMessage(draft.components, values).join("\n");
    const next: ChatLine[] = [...lines, { id: nextId, from: "customer", text: customerMessage }];
    if (reply) next.push({ id: nextId + 1, from: "business", text: reply });
    setLines(next); setNextId(nextId + 2); setMessage("");
  }

  return <aside className="template-simulator" aria-label="Simulador local de conversa WhatsApp">
    <div className="template-simulator-header"><span className="template-simulator-dot" aria-hidden="true" /><div><strong>Chat de teste</strong><small>Simulação local · nenhum WhatsApp conectado</small></div></div>
    <div className="template-simulator-phone">
      <div className="template-chat-window" aria-live="polite" aria-label="Mensagens simuladas">
        {lines.map((line) => <div className={`template-chat-line ${line.from}`} key={line.id}><span>{line.text}</span><small>{line.from === "customer" ? "Cliente" : "CookLily · template"}</small></div>)}
        {!draft.bodyTemplate.trim() && <p className="template-chat-empty">Escreva uma mensagem principal para testar a resposta.</p>}
      </div>
      <form className="template-chat-composer" onSubmit={sendCustomerMessage}><label className="sr-only" htmlFor="template-chat-input">Mensagem como cliente</label><input id="template-chat-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva como cliente…" maxLength={1000} /><button type="submit" aria-label="Enviar mensagem de teste" disabled={!message.trim()}>↑</button></form>
    </div>
    <section className="template-sample-fields"><div><strong>Exemplos das variáveis</strong><p>Valores usados apenas na simulação.</p></div>{variables.length === 0 ? <small>Nenhuma variável numerada encontrada.</small> : variables.map((number) => <label key={number}>{`{{${number}}}`}<input value={values[number] ?? "Exemplo"} maxLength={120} onChange={(event) => setValues((current) => ({ ...current, [number]: event.target.value }))} /></label>)}</section>
    <p className="template-simulator-footnote">Ao enviar, o chat mostra a fala do cliente e aplica a mensagem atual como resposta da empresa. Nenhum dado é salvo ou enviado.</p>
  </aside>;
}
