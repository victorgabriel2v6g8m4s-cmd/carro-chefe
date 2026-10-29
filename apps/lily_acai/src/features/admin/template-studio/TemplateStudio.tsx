import { useMemo, useState, type FormEvent } from "react";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateSimulator } from "./TemplateSimulator";
import { emptyTemplate, makeMetaPayload } from "./template-utils";
import type { TemplateDraft } from "./template-types";
import type { WhatsAppTemplate } from "../whatsapp-api";
import "./template-studio.css";

type Props = {
  templates: WhatsAppTemplate[];
  operationalStages: string[];
  isAdmin: boolean;
  busy: boolean;
  onSave: (draft: TemplateDraft, editingId: string | null) => Promise<boolean>;
  onStatusChange: (item: WhatsAppTemplate, status: WhatsAppTemplate["status"]) => Promise<void>;
};

function draftFromTemplate(item: WhatsAppTemplate): TemplateDraft {
  return {
    key: item.key,
    displayName: item.displayName,
    category: item.category,
    language: item.language,
    bodyTemplate: item.bodyTemplate,
    variables: item.variables,
    metaTemplateName: item.metaTemplateName ?? "",
    components: item.components?.length ? item.components : [{ type: "BODY", text: item.bodyTemplate }]
  };
}

function TemplateCard({ item, canEdit, operationalStages, busy, onEdit, onStatusChange }: {
  item: WhatsAppTemplate;
  canEdit: boolean;
  operationalStages: string[];
  busy: boolean;
  onEdit: () => void;
  onStatusChange: (status: WhatsAppTemplate["status"]) => void;
}) {
  const supportsOrderUpdates = operationalStages.includes(item.key)
    && item.category === "utility"
    && item.components.every((component) => ["BODY", "FOOTER"].includes(component.type));
  return <article className="whatsapp-template-card">
    <div><strong>{item.displayName}</strong><small>{item.key} · {item.category} · {item.language} · {item.status}</small><p>{item.bodyTemplate}</p><small>Meta: {item.metaTemplateName || "ainda não associado"}</small></div>
    <div className="admin-actions">
      <button className="button ghost" type="button" disabled={!canEdit || busy} onClick={onEdit}>Editar</button>
      {canEdit && item.status !== "active" && item.status !== "archived" && supportsOrderUpdates && <button className="button primary" type="button" disabled={busy || !item.metaTemplateName} title={!item.metaTemplateName ? "Associe o nome de um template aprovado na Meta" : undefined} onClick={() => onStatusChange("active")}>Ativar nas notificações</button>}
      {canEdit && item.status === "active" && <button className="button ghost" type="button" disabled={busy} onClick={() => onStatusChange("draft")}>Desativar</button>}
      {canEdit && item.status !== "archived" && <button className="button ghost" type="button" disabled={busy} onClick={() => onStatusChange("archived")}>Arquivar</button>}
    </div>
  </article>;
}

export function TemplateStudio({ templates, operationalStages, isAdmin, busy, onSave, onStatusChange }: Props) {
  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const payload = useMemo(() => makeMetaPayload(draft), [draft]);

  function beginNew() { setDraft(emptyTemplate); setEditingId(null); setCopyMessage(""); }
  function edit(item: WhatsAppTemplate) { setDraft(draftFromTemplate(item)); setEditingId(item.id); setCopyMessage(""); }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin) return;
    if (await onSave(draft, editingId)) beginNew();
  }

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyMessage("JSON Meta copiado. Cole no WhatsApp Manager e faça a revisão final antes de enviar para análise.");
    } catch {
      setCopyMessage("Não foi possível copiar automaticamente. Use o bloco JSON exibido abaixo.");
    }
  }

  return <section className="template-studio" aria-labelledby="template-studio-title">
    <div className="template-studio-heading"><div><span className="eyebrow">Estúdio de templates</span><h2 id="template-studio-title">Crie, revise e simule</h2><p>Monte os componentes da Meta, veja a conversa de exemplo e prepare o JSON para cadastrar manualmente no WhatsApp Manager.</p></div><button type="button" className="button ghost" onClick={beginNew} disabled={!isAdmin || busy}>Novo template</button></div>
    <div className="template-studio-workspace whatsapp-template-layout">
      <form className="analytics-panel whatsapp-template-form template-editor-panel" onSubmit={save}>
        <div className="analytics-panel-heading"><div><span className="eyebrow">{editingId ? "Editando rascunho" : "Novo rascunho"}</span><h3>{editingId ? draft.displayName || "Editar template" : "Configurar template"}</h3></div></div>
        {isAdmin ? <>
          <TemplateBuilder key={(editingId ?? draft.key) || "new-template"} draft={draft} onChange={setDraft} disabled={busy} isEditing={Boolean(editingId)} />
          <div className="template-save-row"><button className="button primary" disabled={busy}>{busy ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar rascunho"}</button><button type="button" className="button ghost" onClick={copyPayload} disabled={busy || !draft.key}>Copiar JSON da Meta</button></div>
          {copyMessage && <p className="template-copy-message" role="status">{copyMessage}</p>}
        </> : <p>Somente admins podem criar ou alterar templates.</p>}
      </form>
      <TemplateSimulator key={(editingId ?? draft.key) || "new-template"} draft={draft} />
    </div>

    <details className="analytics-panel template-export-panel"><summary>Ver JSON pronto para copiar</summary><p>Este painel prepara os componentes para cadastro manual. O status de aprovação continua sendo definido no WhatsApp Manager.</p><pre>{JSON.stringify(payload, null, 2)}</pre></details>

    <section className="analytics-panel template-library"><div className="analytics-panel-heading"><div><span className="eyebrow">Biblioteca</span><h3>Templates salvos</h3><p>Modelos promocionais, de autenticação e componentes especiais ficam como rascunho/exportação. A ativação operacional só vale para uma etapa de pedido compatível.</p></div><span className="template-library-count">{templates.length}</span></div>
      {templates.map((item) => <TemplateCard key={item.id} item={item} canEdit={isAdmin} operationalStages={operationalStages} busy={busy} onEdit={() => edit(item)} onStatusChange={(status) => void onStatusChange(item, status)} />)}
      {templates.length === 0 && <p className="template-empty-library">Nenhum template salvo ainda. Comece criando um rascunho acima.</p>}
    </section>
  </section>;
}
