import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { renderTemplateMessage, textVariables } from "./template-utils";
import type { SimulationNode, TemplateDraft } from "./template-types";
import { initialFlowNode, nextFlowNode } from "./template-flow";
import { defaultPricing, type PricingConfig } from "./template-pricing";
import { WhatsAppText } from "./WhatsAppText";
import { OrderJourneyControls } from "./OrderJourneyControls";
import { journeyEventLabel, type JourneyEventId } from "./journey-events";
import { getWhatsAppSimulator, saveWhatsAppSimulator, saveWhatsAppTemplateFlow, type WhatsAppTemplate } from "../whatsapp-api";
import "./template-simulation.css";
const TemplatePricing = lazy(() => import("./TemplatePricing").then((module) => ({ default: module.TemplatePricing })));
const TemplateFlowBuilder = lazy(() => import("./TemplateFlowBuilder").then((module) => ({ default: module.TemplateFlowBuilder })));
type ChatAction = { label: string; type: string; url?: string; phone?: string };
type ChatLine = { id: number; from: "customer" | "business" | "system"; text: string; header?: string; footer?: string; buttons?: ChatAction[]; category?: string; media?: string; windowOpenAtSend?: boolean; blocked?: boolean };
const seedLines: ChatLine[] = [{ id: 1, from: "system", text: "Sua conversa de teste começa aqui." }];

export function TemplateSimulator({ draft, templates = [], csrfToken = "" }: { draft: TemplateDraft; templates?: WhatsAppTemplate[]; csrfToken?: string }) {
  const [message, setMessage] = useState("");
  const [selectedKey, setSelectedKey] = useState(draft.key);
  const [values, setValues] = useState<Record<number, string>>({ 1: "#2048", 2: "pronto para retirada" });
  const [lines, setLines] = useState(seedLines);
  const [nextId, setNextId] = useState(2);
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState("");
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing);
  const [pricingDirty, setPricingDirty] = useState(false);
  const [flowDirty, setFlowDirty] = useState(false);
  const [origin, setOrigin] = useState<"business" | "customer">("customer");
  const [windowOpen, setWindowOpen] = useState(true);
  const [simulatorMessage, setSimulatorMessage] = useState("");
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const selectedTemplate = (templates.find((template) => template.key === selectedKey) ?? draft) as TemplateDraft;
  const variables = textVariables(selectedTemplate.components);
  const templateOptions = useMemo<WhatsAppTemplate[]>(() => templates.some((template) => template.key === draft.key) ? templates : [...templates, { ...draft, flow: [], id: "current-draft", status: "draft", updatedAt: new Date().toISOString() }], [draft, templates]);

  useEffect(() => {
    const chatWindow = chatWindowRef.current;
    if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
  }, [lines]);

  useEffect(() => {
    let active = true;
    void getWhatsAppSimulator().then((data) => {
      if (!active) return;
      if (data.pricing) setPricing(data.pricing);
      setPricingDirty(false);
      const savedTemplate = templates.find((template) => template.key === selectedKey);
      setNodes(data.flows[selectedKey] ?? savedTemplate?.flow ?? []);
      setFlowDirty(false);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [selectedKey, templates]);

  function buildBusinessLine(template: TemplateDraft, id = nextId, windowOpenAtSend = windowOpen, variableValues = values): ChatLine | null {
    const header = template.components.find((component) => component.type === "HEADER");
    const footer = template.components.find((component) => component.type === "FOOTER");
    const buttonsComponent = template.components.find((component) => component.type === "BUTTONS");
    const buttons = Array.isArray(buttonsComponent?.buttons) ? buttonsComponent.buttons.flatMap((button) => {
      if (!button || typeof button !== "object" || Array.isArray(button)) return [];
      const type = String(button.type ?? "QUICK_REPLY");
      const label = typeof button.text === "string" ? button.text : ({ OTP: "Copiar código", COPY_CODE: "Copiar código", FLOW: "Abrir formulário" } as Record<string, string>)[type];
      return label ? [{ label, type, url: typeof button.url === "string" ? button.url : undefined, phone: typeof button.phone_number === "string" ? button.phone_number : undefined }] : [];
    }) : [];
    const media = header && typeof header.format === "string" && header.format !== "TEXT" ? header.format : "";
    const title = header && typeof header.text === "string" ? renderTemplateMessage([{ type: "HEADER", text: header.text }], variableValues).join("") : "";
    const body = template.components.find((component) => component.type === "BODY");
    const content = typeof body?.text === "string" ? renderTemplateMessage([{ type: "BODY", text: body.text }], variableValues).join("") : "";
    const tail = typeof footer?.text === "string" ? renderTemplateMessage([{ type: "FOOTER", text: footer.text }], variableValues).join("") : "";
    if (!title && !content && !tail && !media) return null;
    return { id, from: "business", text: content, header: title, footer: tail, category: template.category, buttons, media, windowOpenAtSend };
  }

  function addBusinessMessage(template = selectedTemplate, windowOpenAtSend = windowOpen) {
    const line = buildBusinessLine(template, nextId, windowOpenAtSend);
    if (!line) return;
    line.category = template.category;
    setLines((current) => [...current, line]);
    setNextId((id) => id + 1);
  }

  function startFlow() {
    const node = initialFlowNode(nodes);
    if (!node) return;
    const template = templateOptions.find((item) => item.key === node.templateKey) as TemplateDraft | undefined;
    const customerArrival: ChatLine | null = origin === "customer" ? { id: nextId, from: "customer", text: "Oi! Vim pelo WhatsApp e quero fazer um pedido." } : null;
    const responseId = nextId + (customerArrival ? 1 : 0);
    const line = template ? buildBusinessLine(template, responseId, windowOpen) : { id: responseId, from: "business" as const, text: windowOpen ? node.name : "Resposta não enviada: a conversa precisa começar com um template aprovado.", category: "service", windowOpenAtSend: windowOpen, blocked: !windowOpen };
    if (line) {
      setLines((current) => [...current, ...(customerArrival ? [customerArrival] : []), line]); setNextId((id) => id + (customerArrival ? 2 : 1)); setActiveNodeId(node.id);
    }
  }

  function triggerJourneyEvent(eventId: JourneyEventId, orderNumber: string) {
    const eventLabel = journeyEventLabel(eventId);
    const eventMessage = eventId === "site_menu_opened" ? "Cliente abriu o cardápio pelo link da conversa." : `${eventLabel}: ${orderNumber}.`;
    const eventValues = { ...values, 1: orderNumber };
    setValues(eventValues);
    setSimulatorMessage(`Gatilho: ${eventLabel}.`);
    const activeNode = nodes.find((node) => node.id === activeNodeId);
    const nextNode = activeNode ? nextFlowNode(nodes, activeNode.id, eventId, eventId) : null;
    const eventLine: ChatLine = { id: nextId, from: "system", text: eventMessage };
    if (!nextNode) {
      setLines((current) => [...current, eventLine]);
      setNextId((id) => id + 1);
      return;
    }
    const template = templateOptions.find((item) => item.key === nextNode.templateKey) as TemplateDraft | undefined;
    const replyId = nextId + 1;
    const response = template ? buildBusinessLine(template, replyId, true, eventValues) : { id: replyId, from: "business" as const, text: nextNode.name, category: "service", windowOpenAtSend: true };
    setLines((current) => [...current, eventLine, ...(response ? [response] : [])]);
    setNextId((id) => id + (response ? 2 : 1));
    setActiveNodeId(nextNode.id);
    setWindowOpen(true);
  }

  function editFlow(next: SimulationNode[]) { setNodes(next); setFlowDirty(true); setSimulatorMessage(""); }
  function editPricing(next: PricingConfig) { setPricing(next); setPricingDirty(true); setSimulatorMessage(""); }
  async function persistFlow() {
    const savedTemplate = templates.find((template) => template.key === selectedKey);
    if (!savedTemplate || !csrfToken) return;
    try { await saveWhatsAppTemplateFlow(selectedKey, csrfToken, nodes); setFlowDirty(false); setSimulatorMessage("Fluxo salvo neste template."); }
    catch (cause) { setSimulatorMessage(cause instanceof Error ? cause.message : "Não foi possível salvar o fluxo."); }
  }
  async function persistPricing() {
    if (!csrfToken) return;
    try { await saveWhatsAppSimulator(csrfToken, pricing); setPricingDirty(false); setSimulatorMessage("Tarifas e câmbio salvos."); }
    catch (cause) { setSimulatorMessage(cause instanceof Error ? cause.message : "Não foi possível salvar as tarifas."); }
  }

  function sendCustomerMessage(event: FormEvent, selectedReply?: string) {
    event.preventDefault();
    const customerMessage = (selectedReply ?? message).trim();
    if (!customerMessage) return;
    setLines((current) => [...current, { id: nextId, from: "customer", text: customerMessage }]);
    setWindowOpen(true);
    setNextId((id) => id + 1); setMessage("");
    const activeNode = nodes.find((node) => node.id === activeNodeId) ?? initialFlowNode(nodes);
    const nextNode = activeNode ? nextFlowNode(nodes, activeNode.id, customerMessage, selectedReply ? "botão" : "texto") : null;
    if (nextNode) {
      const template = (templateOptions.find((item) => item.key === nextNode.templateKey) ?? selectedTemplate) as TemplateDraft;
      const line = nextNode.templateKey ? buildBusinessLine(template, nextId + 1, true) : { id: nextId + 1, from: "business" as const, text: nextNode.name, category: "service", windowOpenAtSend: true };
      if (line) { setLines((current) => [...current, line]); setNextId((id) => id + 2); }
      setActiveNodeId(nextNode.id);
    }
  }

  return <aside className="template-simulator" aria-label="Simulador local de conversa WhatsApp">
    <div className="template-simulator-header"><span className="template-simulator-dot" aria-hidden="true" /><div><strong>Chat de teste</strong><small>Simulação local · nada é enviado à Meta</small></div></div>
    <label>Template selecionado<select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>{templateOptions.map((template) => <option key={template.key || "current"} value={template.key}>{template.displayName || "Rascunho atual"} · {template.category}</option>)}</select></label>
    {simulatorMessage && <p className="template-simulator-feedback" role="status">{simulatorMessage}</p>}
    <div className="template-simulator-phone">
      <div className="template-chat-window" ref={chatWindowRef} aria-live="polite" aria-label="Mensagens simuladas">
        {lines.map((line) => <div className={`template-chat-line ${line.from}${line.blocked ? " blocked" : ""}${line.buttons?.length ? " has-buttons" : ""}`} key={line.id}>
          <div className="template-chat-content">{line.from === "business" && <strong>CookLily</strong>}{line.media && <div className={`template-chat-media ${line.media.toLowerCase()}`} aria-label={`Prévia de ${line.media.toLowerCase()}`}>{line.media === "IMAGE" ? "▧ Imagem de exemplo" : line.media === "VIDEO" ? "▶ Vídeo de exemplo" : line.media === "DOCUMENT" ? "▤ Documento de exemplo" : "📍 Localização de exemplo"}</div>}{line.header && <strong className="template-chat-header-text"><WhatsAppText text={line.header} /></strong>}{line.text && <WhatsAppText text={line.text} />}{line.footer && <small className="template-chat-footer"><WhatsAppText text={line.footer} /></small>}{line.from === "business" && <small>{line.blocked ? "Bloqueada · fora da janela" : `${line.category} · agora`}</small>}{line.from === "customer" && <small>Cliente · agora</small>}</div>
          {line.buttons?.length ? <div className="template-chat-buttons">{line.buttons.map((button) => button.url ? <a className="template-chat-button" href={button.url} key={button.label} target="_blank" rel="noreferrer">{button.label}</a> : button.type === "PHONE_NUMBER" ? <a className="template-chat-button" href={`tel:${button.phone ?? button.label}`} key={button.label}>☎ {button.label}</a> : button.type === "OTP" || button.type === "COPY_CODE" ? <button type="button" className="template-chat-button" key={button.label} onClick={() => void navigator.clipboard?.writeText(button.type === "COPY_CODE" ? values[1] ?? "123456" : "123456")}>{button.label}</button> : <button type="button" className="template-chat-button" key={button.label} onClick={(event) => sendCustomerMessage(event, button.label)}>{button.label}</button>)}</div> : null}
        </div>)}
        {!selectedTemplate.bodyTemplate.trim() && <p className="template-chat-empty">Selecione um template com conteúdo ou inicie um fluxo.</p>}
      </div>
      <form className="template-chat-composer" onSubmit={(event) => sendCustomerMessage(event)}><label className="sr-only" htmlFor="template-chat-input">Mensagem como cliente</label><input id="template-chat-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva como cliente…" maxLength={1000} /><button type="submit" aria-label="Enviar mensagem de teste" disabled={!message.trim()}>↑</button></form>
    </div>
    <div className="template-chat-actions"><button type="button" className="button ghost" onClick={() => addBusinessMessage(selectedTemplate, origin === "customer")}>CookLily envia template</button><button type="button" className="button ghost" onClick={() => { setLines(seedLines); setNextId(2); setActiveNodeId(""); setWindowOpen(origin === "customer"); setSimulatorMessage(""); }}>Limpar conversa</button></div>
    <OrderJourneyControls enabled={Boolean(activeNodeId)} onTrigger={triggerJourneyEvent} />
    <section className="template-sample-fields"><div><strong>Exemplos das variáveis</strong><p>Valores usados apenas na simulação.</p></div>{variables.length === 0 ? <small>Nenhuma variável numerada encontrada.</small> : variables.map((number) => <label key={number}><span>{selectedTemplate.variableNames[number - 1] || `{{${number}}}`} · {`{{${number}}}`}</span><input value={values[number] ?? "Exemplo"} maxLength={120} onChange={(event) => setValues((current) => ({ ...current, [number]: event.target.value }))} /></label>)}</section>
    <Suspense fallback={null}><TemplateFlowBuilder templates={templateOptions} nodes={nodes} onChange={editFlow} onStart={startFlow} /><div className="template-simulator-save-row"><small>{templates.some((template) => template.key === selectedKey) ? flowDirty ? "Fluxo alterado; salve para persistir." : "Fluxo salvo no template selecionado." : "Salve este rascunho para habilitar a persistência do fluxo."}</small><button type="button" className="button primary" onClick={() => void persistFlow()} disabled={!flowDirty || !csrfToken || !templates.some((template) => template.key === selectedKey)}>Salvar fluxo</button></div><TemplatePricing config={pricing} onChange={editPricing} onSave={() => void persistPricing()} dirty={pricingDirty} outbound={lines.filter((line) => line.from === "business").map((line) => ({ category: line.category ?? "service", windowOpen: Boolean(line.windowOpenAtSend) }))} origin={origin} onOriginChange={(value) => { setOrigin(value); setWindowOpen(value === "customer"); }} /></Suspense>
    <p className="template-simulator-footnote">Mensagens simuladas ficam só neste navegador e nunca são enviadas à Meta. Fluxos e tarifas são persistidos no painel somente quando você os salva. Mídias são prévias de demonstração.</p>
  </aside>;
}
