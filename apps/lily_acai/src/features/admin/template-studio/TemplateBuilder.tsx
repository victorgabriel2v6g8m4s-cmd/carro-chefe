import { useState, type ChangeEvent } from "react";
import { bodyTemplateFrom, componentText, upsertComponent, validateComponents } from "./template-utils";
import type { JsonValue, MetaTemplateComponent, TemplateDraft } from "./template-types";

type Props = { draft: TemplateDraft; onChange: (next: TemplateDraft) => void; disabled?: boolean; isEditing?: boolean };
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
const headers: Array<{ value: HeaderFormat | "NONE"; label: string }> = [
  { value: "NONE", label: "Sem cabeçalho" }, { value: "TEXT", label: "Texto" },
  { value: "IMAGE", label: "Imagem" }, { value: "VIDEO", label: "Vídeo" },
  { value: "DOCUMENT", label: "Documento" }, { value: "LOCATION", label: "Localização" }
];
const buttonTypes = ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "FLOW", "OTP"] as const;

function headerComponent(components: MetaTemplateComponent[]) {
  return components.find((item) => item.type === "HEADER");
}

function componentFormat(component?: MetaTemplateComponent) {
  return typeof component?.format === "string" ? component.format : "NONE";
}

function updateButton(components: MetaTemplateComponent[], index: number, key: string, value: JsonValue) {
  const buttonGroup = components.find((item) => item.type === "BUTTONS");
  const buttons = Array.isArray(buttonGroup?.buttons) ? [...buttonGroup.buttons] : [];
  const current = buttons[index];
  if (!current || typeof current !== "object" || Array.isArray(current)) return components;
  buttons[index] = { ...current, [key]: value } as JsonValue;
  return upsertComponent(components, { type: "BUTTONS", buttons: buttons as JsonValue[] });
}

export function TemplateBuilder({ draft, onChange, disabled = false, isEditing = false }: Props) {
  const [advancedJson, setAdvancedJson] = useState(() => JSON.stringify(draft.components, null, 2));
  const [jsonError, setJsonError] = useState("");
  const [jsonApplied, setJsonApplied] = useState(false);
  const header = headerComponent(draft.components);
  const buttonsComponent = draft.components.find((item) => item.type === "BUTTONS");
  const buttons = Array.isArray(buttonsComponent?.buttons) ? buttonsComponent.buttons : [];

  function setField<K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function setHeaderFormat(format: HeaderFormat | "NONE") {
    const components = draft.components.filter((item) => item.type !== "HEADER");
    if (format !== "NONE") {
      const next: MetaTemplateComponent = format === "LOCATION"
        ? { type: "HEADER", format }
        : format === "TEXT" ? { type: "HEADER", format, text: "" } : { type: "HEADER", format };
      onChange({ ...draft, components: upsertComponent(components, next) });
    } else onChange({ ...draft, components });
  }

  function setTextComponent(type: "BODY" | "FOOTER", text: string) {
    const components = type === "FOOTER" && !text
      ? draft.components.filter((item) => item.type !== type)
      : upsertComponent(draft.components, { type, text });
    const bodyTemplate = type === "BODY" ? text : draft.bodyTemplate;
    onChange({ ...draft, components, bodyTemplate });
  }

  function setButtonCount(count: number) {
    const next = buttons.slice(0, count);
    while (next.length < count) next.push({ type: "QUICK_REPLY", text: "" });
    const components = count ? upsertComponent(draft.components, { type: "BUTTONS", buttons: next as JsonValue[] }) : draft.components.filter((item) => item.type !== "BUTTONS");
    onChange({ ...draft, components });
  }

  function setButtonType(index: number, type: string) {
    const initial: Record<string, JsonValue> = { type, text: "" };
    if (type === "URL") initial.url = "";
    if (type === "PHONE_NUMBER") initial.phone_number = "";
    if (type === "FLOW") { initial.flow_id = ""; initial.flow_action = "navigate"; initial.navigate_screen = ""; }
    if (type === "OTP") initial.otp_type = "COPY_CODE";
    const currentButtons = [...buttons]; currentButtons[index] = initial;
    onChange({ ...draft, components: upsertComponent(draft.components, { type: "BUTTONS", buttons: currentButtons }) });
  }

  function applyAdvancedJson() {
    try {
      const parsed: unknown = JSON.parse(advancedJson);
      const components = validateComponents(parsed);
      if (!components) throw new Error("Informe uma lista válida com até 10 componentes Meta e JSON simples.");
      const bodyTemplate = bodyTemplateFrom(components);
      onChange({ ...draft, components, bodyTemplate });
      setJsonError(""); setJsonApplied(true);
    } catch (error) {
      setJsonApplied(false);
      setJsonError(error instanceof Error ? error.message : "JSON inválido.");
    }
  }

  function onNumberField(event: ChangeEvent<HTMLInputElement>) {
    const index = Number(event.currentTarget.dataset.buttonIndex);
    const key = event.currentTarget.dataset.buttonKey;
    if (key) onChange({ ...draft, components: updateButton(draft.components, index, key, event.currentTarget.value) });
  }

  function buttonText(button: JsonValue) {
    return button && typeof button === "object" && !Array.isArray(button) && typeof button.text === "string" ? button.text : "";
  }

  function buttonString(button: JsonValue, key: string) {
    return button && typeof button === "object" && !Array.isArray(button) && typeof button[key] === "string" ? button[key] as string : "";
  }

  return <div className="template-builder">
    <div className="template-step-heading"><span>Etapa 1 de 3</span><strong>Identificação</strong><p>Escolha o tipo de mensagem, idioma e nome que será usado no WhatsApp Manager.</p></div>
    <div className="template-form-grid">
      <label>Nome interno do template<input required minLength={2} maxLength={80} pattern="[a-z0-9][a-z0-9_]*" value={draft.key} onChange={(event) => setField("key", event.target.value)} disabled={disabled || isEditing} placeholder="ex.: pedido_pronto" /><small>Use letras minúsculas, números e sublinhado; será o identificador exportado.</small></label>
      <label>Nome para a equipe<input required minLength={2} maxLength={120} value={draft.displayName} onChange={(event) => setField("displayName", event.target.value)} disabled={disabled} placeholder="ex.: Pedido pronto para retirada" /></label>
      <label>Categoria Meta<select value={draft.category} onChange={(event) => setField("category", event.target.value as TemplateDraft["category"])} disabled={disabled}><option value="utility">Utilidade · atualizações e transações</option><option value="marketing">Marketing · ofertas e novidades</option><option value="authentication">Autenticação · códigos de acesso</option></select><small>A Meta revisa a categoria e pode reclassificá-la.</small></label>
      <label>Idioma do template<input required pattern="[a-z]{2}_[A-Z]{2}" maxLength={12} value={draft.language} onChange={(event) => setField("language", event.target.value)} disabled={disabled} placeholder="pt_BR" /><small>Formato local, por exemplo pt_BR ou en_US.</small></label>
    </div>

    <div className="template-step-heading"><span>Etapa 2 de 3</span><strong>Conteúdo e componentes</strong><p>Monte os blocos como serão cadastrados na Meta. Use variáveis numeradas como <code>{"{{1}}"}</code> e preencha exemplos na simulação.</p></div>
    <div className="template-form-grid">
      <label>Cabeçalho<select value={componentFormat(header) as HeaderFormat | "NONE"} onChange={(event) => setHeaderFormat(event.target.value as HeaderFormat | "NONE")} disabled={disabled}>{headers.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      {componentFormat(header) === "TEXT" && <label className="template-span-two">Texto do cabeçalho<input maxLength={60} value={componentText(draft.components, "HEADER")} onChange={(event) => onChange({ ...draft, components: upsertComponent(draft.components, { ...header!, text: event.target.value }) })} disabled={disabled} placeholder="Ex.: Atualização do seu pedido" /><small>Até 60 caracteres. As variáveis de cabeçalho também aparecem na simulação.</small></label>}
      {header && !["TEXT", "LOCATION"].includes(componentFormat(header)) && <p className="template-hint template-span-two">O arquivo de mídia de exemplo é escolhido no WhatsApp Manager. O componente será incluído no JSON, sem enviar ou armazenar mídia aqui.</p>}
      {header && componentFormat(header) === "LOCATION" && <p className="template-hint template-span-two">O cabeçalho de localização será montado com os campos de localização no WhatsApp Manager.</p>}
      <label className="template-span-two">Mensagem principal<textarea required rows={5} maxLength={1024} value={componentText(draft.components, "BODY")} onChange={(event) => setTextComponent("BODY", event.target.value)} disabled={disabled} placeholder="Escreva a mensagem. Para inserir um dado variável, use {{1}}." /><small>{componentText(draft.components, "BODY").length}/1024 · Evite mensagens vagas e explique o contexto ao cliente.</small></label>
      <fieldset className="template-variables-fieldset template-span-two"><legend>Valores para notificações de pedidos</legend><p>Opcional. Se este rascunho for uma etapa operacional, marque os valores na mesma ordem das variáveis do corpo.</p>{(["orderNumber", "stageLabel"] as const).map((name) => <label className="toggle" key={name}><input type="checkbox" checked={draft.variables.includes(name)} onChange={(event) => setField("variables", event.target.checked ? [...draft.variables, name] : draft.variables.filter((value) => value !== name))} disabled={disabled} />{name === "orderNumber" ? "Número do pedido" : "Etapa atual do pedido"}</label>)}</fieldset>
      <label className="template-span-two">Rodapé opcional<textarea rows={2} maxLength={60} value={componentText(draft.components, "FOOTER")} onChange={(event) => setTextComponent("FOOTER", event.target.value)} disabled={disabled} placeholder="Ex.: CookLily" /><small>Até 60 caracteres.</small></label>
    </div>

    <fieldset className="template-buttons-fieldset"><legend>Botões opcionais</legend><div className="template-fieldset-intro"><span>Adicione até 3 botões e escolha a ação de cada um.</span><label>Quantidade<select value={buttons.length} onChange={(event) => setButtonCount(Number(event.target.value))} disabled={disabled}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>
      {buttons.map((item, index) => <div className="template-button-editor" key={index}>
        <strong>Botão {index + 1}</strong><label>Tipo<select value={buttonString(item, "type")} onChange={(event) => setButtonType(index, event.target.value)} disabled={disabled}>{buttonTypes.map((type) => <option key={type} value={type}>{({ QUICK_REPLY: "Resposta rápida", URL: "Abrir site", PHONE_NUMBER: "Ligar", COPY_CODE: "Copiar código", FLOW: "Abrir Flow", OTP: "Código de autenticação" } as Record<string, string>)[type]}</option>)}</select></label>
        <label>Texto do botão<input required maxLength={25} value={buttonText(item)} data-button-index={index} data-button-key="text" onChange={onNumberField} disabled={disabled} /></label>
        {buttonString(item, "type") === "URL" && <><label>URL de destino<input type="url" required value={buttonString(item, "url")} data-button-index={index} data-button-key="url" onChange={onNumberField} disabled={disabled} placeholder="https://" /></label><small>Para URL dinâmica, use o sufixo variável no JSON avançado.</small></>}
        {buttonString(item, "type") === "PHONE_NUMBER" && <label>Número de telefone<input type="tel" required value={buttonString(item, "phone_number")} data-button-index={index} data-button-key="phone_number" onChange={onNumberField} disabled={disabled} placeholder="+5567999999999" /></label>}
        {buttonString(item, "type") === "FLOW" && <><label>ID do Flow<input required value={buttonString(item, "flow_id")} data-button-index={index} data-button-key="flow_id" onChange={onNumberField} disabled={disabled} /></label><label>Tela inicial<input value={buttonString(item, "navigate_screen")} data-button-index={index} data-button-key="navigate_screen" onChange={onNumberField} disabled={disabled} /></label></>}
        {buttonString(item, "type") === "OTP" && <label>Formato do código<select value={buttonString(item, "otp_type") || "COPY_CODE"} onChange={(event) => onChange({ ...draft, components: updateButton(draft.components, index, "otp_type", event.target.value) })} disabled={disabled}><option value="COPY_CODE">Copiar código</option><option value="ONE_TAP">Um toque</option><option value="ZERO_TAP">Sem toque</option></select></label>}
      </div>)}
      {draft.category === "authentication" && <p className="template-hint">Autenticação tem requisitos próprios de segurança, texto e formato de botão. Confira as opções e o preview final no WhatsApp Manager.</p>}
    </fieldset>

    <details className="template-advanced-json"><summary>Avançado · editar componentes JSON da Meta</summary><p>Use para componentes especiais do catálogo Meta, como carrossel, oferta por tempo limitado e formatos de autenticação. O JSON fica validado antes de ser aplicado.</p><label>Array de componentes<textarea rows={12} spellCheck={false} value={advancedJson} onChange={(event) => { setAdvancedJson(event.target.value); setJsonApplied(false); }} disabled={disabled} /></label><div className="admin-actions"><button type="button" className="button ghost" onClick={() => setAdvancedJson(JSON.stringify(draft.components, null, 2))} disabled={disabled}>Atualizar JSON do construtor</button><button type="button" className="button ghost" onClick={applyAdvancedJson} disabled={disabled}>Validar e aplicar JSON</button></div>{jsonError && <p className="error" role="alert">{jsonError}</p>}{jsonApplied && <p className="success" role="status">Componentes avançados aplicados ao preview e à exportação.</p>}</details>

    <div className="template-step-heading"><span>Etapa 3 de 3</span><strong>Revisar e preparar para a Meta</strong><p>Salve como rascunho, teste no chat local e copie o JSON para criar o template no WhatsApp Manager.</p></div>
    <label>Nome existente aprovado no WhatsApp Manager <input maxLength={512} pattern="[a-z0-9_]+" value={draft.metaTemplateName} onChange={(event) => setField("metaTemplateName", event.target.value)} disabled={disabled} placeholder="Opcional até aprovação Meta" /><small>O painel não cria, envia nem aprova templates pela Meta.</small></label>
  </div>;
}
