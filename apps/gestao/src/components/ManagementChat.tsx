import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { AttachmentPicker } from "./AttachmentPicker";
import { ManagementMessageCard } from "./ManagementMessageCard";
import { ReferenceComposer, type ScopedReference } from "./ReferenceComposer";

export function ManagementChat() {
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [references, setReferences] = useState<ScopedReference[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const selectedId = params.get("conversation");
  const active = useMemo(() => conversations.find((item) => item.id === selectedId) ?? conversations[0] ?? null, [conversations, selectedId]);

  async function load() {
    const items = await api<any[]>("/api/v1/management-conversations?userId=owner&status=active&limit=10");
    setConversations(items);
    if (!selectedId && items[0]) setParams((current) => { const next = new URLSearchParams(current); next.set("mode", "chat"); next.set("conversation", items[0].id); return next; }, { replace: true });
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const stream = new EventSource("/api/v1/events");
    const update = () => void load();
    ["management.message.created", "management.response.created", "management.response.completed", "management.response.attention", "agent.run.updated", "agent.dispatch.flushed"].forEach((name) => stream.addEventListener(name, update));
    return () => stream.close();
  }, [selectedId]);

  async function createConversation() {
    const created = await api<any>("/api/v1/management-conversations", json("POST", { userId: "owner", title: "Conversa com Gestão" }));
    await load();
    setParams((current) => { const next = new URLSearchParams(current); next.set("mode", "chat"); next.set("conversation", created.id); return next; });
    return created;
  }

  async function uploadFiles() {
    const attachmentIds: string[] = [];
    for (const file of files) {
      setFeedback(`Enviando ${file.name}…`);
      const form = new FormData(); form.append("purpose", "management-message-draft"); form.append("actor", "proprietario"); form.append("file", file);
      attachmentIds.push((await api<any>("/api/v1/uploads", { method: "POST", body: form })).id);
    }
    return attachmentIds;
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setFeedback("");
    try {
      const conversation = active ?? await createConversation();
      const attachmentIds = await uploadFiles();
      await api(`/api/v1/management-conversations/${conversation.id}/messages`, json("POST", { content, attachmentIds, references, submittedBy: "PROPRIETARIO" }));
      setContent(""); setFiles([]); setReferences([]); setFeedback("Mensagem entregue à Gestão. A resposta aparecerá aqui."); await load();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSending(false); }
  }

  return <section className="panel management-chat">
    <div className="section-title"><div><span className="eyebrow">Canal contínuo · sem criar tarefa</span><h3>Conversa com Gestão</h3></div><button type="button" className="button button--quiet" onClick={() => void createConversation()}>Nova conversa</button></div>
    <p className="management-chat-intro">A Gestão mantém o contexto e pode consultar especialistas. Consultas independentes são agrupadas por agente; somente dependências indispensáveis pausam a resposta.</p>
    {conversations.length > 1 && <label className="chat-selector"><span>Conversa ativa</span><select value={active?.id ?? ""} onChange={(event) => setParams((current) => { const next = new URLSearchParams(current); next.set("mode", "chat"); next.set("conversation", event.target.value); return next; })}>{conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title} · {formatDate(conversation.updatedAt)}</option>)}</select></label>}
    <div className="management-thread" aria-live="polite">{active?.messages?.length ? active.messages.map((message: any) => <ManagementMessageCard key={message.id} message={message} />) : <div className="empty"><p>Inicie uma conversa para pedir orientação, esclarecer uma decisão ou solicitar que a Gestão consulte especialistas.</p></div>}</div>
    <form className="management-chat-form" onSubmit={submit}><label><span>Sua mensagem</span><ReferenceComposer value={content} onChange={setContent} references={references} onReferencesChange={setReferences} disabled={sending} placeholder="Converse com a Gestão. Use @ para acrescentar contexto do projeto." /></label><AttachmentPicker files={files} onChange={setFiles} disabled={sending} /><div><small>{feedback || "Informações úteis desta mensagem serão encaminhadas para a memória operacional."}</small><button className="button button--gold" disabled={sending}>{sending ? "Enviando…" : "Enviar para Gestão"}</button></div></form>
  </section>;
}
