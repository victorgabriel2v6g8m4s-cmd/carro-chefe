import { useEffect, useState, type FormEvent } from "react";
import { api, json } from "../api/client";
import { AttachmentPicker } from "./AttachmentPicker";
import { KnowledgeFilePreview } from "./KnowledgeFilePreview";
import { ReferenceComposer, type ScopedReference } from "./ReferenceComposer";

type EditorInitial = { name?: string; value?: string; kind?: "branch" | "fact"; valueType?: string; verificationStatus?: string; references?: ScopedReference[]; sourceRunId?: string | null };

export function KnowledgeNodeEditor({ node, parent, initial, onClose, onSaved, onDeleted }:
  { node?: any; parent?: any | null; initial?: EditorInitial; onClose: () => void; onSaved: (node: any) => void; onDeleted: (node: any) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"branch" | "fact">("branch");
  const [value, setValue] = useState("");
  const [valueType, setValueType] = useState("text");
  const [verificationStatus, setVerificationStatus] = useState("informed");
  const [references, setReferences] = useState<ScopedReference[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(node?.name ?? initial?.name ?? ""); setKind(node?.kind ?? initial?.kind ?? "branch"); setValue(node?.value ?? initial?.value ?? "");
    setValueType(node?.valueType ?? initial?.valueType ?? "text"); setVerificationStatus(node?.verificationStatus ?? initial?.verificationStatus ?? "informed");
    setReferences(node?.references ?? initial?.references ?? []); setExistingAttachments(node?.attachments ?? []); setFiles([]); setFeedback(""); setConfirmDelete(false);
  }, [node?.id, parent?.id, initial?.sourceRunId]);

  async function uploadFiles() {
    const ids: string[] = [];
    for (const file of files) {
      setFeedback(`Enviando ${file.name}…`);
      const form = new FormData(); form.append("purpose", "knowledge-node-draft"); form.append("actor", "PROPRIETARIO"); form.append("file", file);
      ids.push((await api<any>("/api/v1/uploads", { method: "POST", body: form })).id);
    }
    return ids;
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFeedback("");
    try {
      const attachmentIds = [...existingAttachments.map((item) => item.id), ...await uploadFiles()];
      const body = { name, kind, value: value.trim() || null, valueType, verificationStatus, references, attachmentIds, actor: "PROPRIETARIO" };
      const saved = node ? await api<any>(`/api/v1/knowledge/nodes/${node.id}`, json("PATCH", { ...body, expectedVersion: node.version }))
        : await api<any>("/api/v1/knowledge/nodes", json("POST", { ...body, parentId: parent?.id ?? null, sourceRunId: initial?.sourceRunId ?? null }));
      setFeedback("Informação salva na memória operacional."); setFiles([]); onSaved(saved);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!node) return; setBusy(true); setFeedback("");
    try { await api(`/api/v1/knowledge/nodes/${node.id}`, json("DELETE", { expectedVersion: node.version, actor: "PROPRIETARIO" })); onDeleted(node); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); setBusy(false); }
  }

  return <aside className="knowledge-editor" aria-label={node ? `Editar ${node.name}` : "Criar ramo"}><div className="section-title"><div><span className="eyebrow">{node ? "Editar ramo" : parent ? `Novo item em ${parent.name}` : "Novo ramo raiz"}</span><h3>{node?.name ?? "Estruturar informação"}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar editor">×</button></div>
    <form className="form-stack" onSubmit={submit}><label><span>Nome do ramo</span><input autoFocus required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Tipo</span><select value={kind} onChange={(event) => setKind(event.target.value as "branch" | "fact")}><option value="branch">Ramo organizador</option><option value="fact">Informação consultável</option></select></label>
      <label><span>{kind === "fact" ? "Informação" : "Nota opcional"}</span><ReferenceComposer required={kind === "fact"} value={value} onChange={setValue} references={references} onReferencesChange={setReferences} disabled={busy} placeholder="Digite @ para relacionar arquivos, tarefas, decisões ou outros ramos." /></label>
      <div className="form-two"><label><span>Formato</span><select value={valueType} onChange={(event) => setValueType(event.target.value)}><option value="text">Texto</option><option value="address">Endereço</option><option value="decision">Decisão</option><option value="contact">Contato</option><option value="url">URL</option><option value="number">Número</option><option value="list">Lista</option></select></label><label><span>Confiabilidade</span><select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)}><option value="informed">Informado pelo proprietário</option><option value="pending_verification">Pendente de verificação</option><option value="verified">Verificado</option><option value="derived">Derivado por agente</option></select></label></div>
      {existingAttachments.length > 0 && <div className="knowledge-existing-files"><span>Arquivos vinculados</span>{existingAttachments.map((upload) => <div key={upload.id}><KnowledgeFilePreview upload={upload} /><button type="button" aria-label={`Desvincular ${upload.originalName}`} onClick={() => setExistingAttachments((items) => items.filter((item) => item.id !== upload.id))}>×</button></div>)}</div>}
      <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />{feedback && <p className="form-feedback" role="status">{feedback}</p>}<div className="knowledge-editor-actions"><button className="button button--gold" disabled={busy}>{busy ? "Salvando…" : "Salvar ramo"}</button>{node && !confirmDelete && <button type="button" className="button button--danger" onClick={() => setConfirmDelete(true)}>Excluir ramo</button>}</div>
      {confirmDelete && <div className="delete-confirm" role="alert"><p>O ramo e seus descendentes sairão da árvore, mas a auditoria será preservada.</p><button type="button" className="button button--danger" disabled={busy} onClick={() => void remove()}>Confirmar exclusão</button><button type="button" className="button button--quiet" onClick={() => setConfirmDelete(false)}>Cancelar</button></div>}
    </form>
  </aside>;
}
