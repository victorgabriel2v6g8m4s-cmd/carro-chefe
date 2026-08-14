import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { AttachmentPicker } from "./AttachmentPicker";
import { ReferenceComposer, type ScopedReference } from "./ReferenceComposer";
import { RichReferences } from "./RichReferences";
import { StatusBadge } from "./StatusBadge";

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

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setFeedback("");
    try {
      const conversation = active ?? await createConversation();
      const attachmentIds: string[] = [];
      for (const file of files) {
        setFeedback(`Enviando ${file.name}…`);
        const form = new FormData();
        form.append("purpose", "management-message-draft"); form.append("actor", "proprietario"); form.append("file", file);
        attachmentIds.push((await api<any>("/api/v1/uploads", { method: "POST", body: form })).id);
      }
      await api(`/api/v1/management-conversations/${conversation.id}/messages`, json("POST", { content, attachmentIds, references, submittedBy: "PROPRIETARIO" }));
      setContent(""); setFiles([]); setReferences([]); setFeedback("Mensagem entregue à Gestão. A resposta aparecerá aqui."); await load();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSending(false); }
  }

  return <section className="panel management-chat"><div className="section-title"><div><span className="eyebrow">Canal contínuo · sem criar tarefa</span><h3>Conversa com Gestão</h3></div><button type="button" className="button button--quiet" onClick={() => void createConversation()}>Nova conversa</button></div>
    <p className="management-chat-intro">A Gestão mantém o contexto e pode consultar especialistas. Consultas independentes são agrupadas por agente; somente dependências indispensáveis pausam a resposta.</p>
    {conversations.length > 1 && <label className="chat-selector"><span>Conversa ativa</span><select value={active?.id ?? ""} onChange={(event) => setParams((current) => { const next = new URLSearchParams(current); next.set("mode", "chat"); next.set("conversation", event.target.value); return next; })}>{conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title} · {formatDate(conversation.updatedAt)}</option>)}</select></label>}
    <div className="management-thread" aria-live="polite">{active?.messages?.length ? active.messages.map((message: any) => <article key={message.id} className={`management-message management-message--${message.sender === "PROPRIETARIO" || message.sender === "owner" || message.sender === "proprietario" ? "owner" : "agent"}`}><header><strong>{message.sender === "AG-GESTAO" ? "Gestão" : "Você"}</strong><time>{formatDate(message.createdAt)}</time>{message.run && <StatusBadge status={message.run.status} />}</header><p><RichReferences text={message.content} /></p>{message.references?.length > 0 && <div className="message-references">{message.references.map((reference: any) => reference.route ? <Link key={`${reference.type}-${reference.id}`} to={reference.route}>@{reference.id}</Link> : <b key={`${reference.type}-${reference.id}`}>@{reference.id}</b>)}</div>}{message.uploads?.length > 0 && <div className="message-attachments">{message.uploads.map((upload: any) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}>{upload.originalName}</Link>)}</div>}{message.runId && <Link className="message-run-link" to={`/gestao/agentes/execucoes/${message.runId}`}>Abrir execução e logs</Link>}</article>) : <div className="empty"><p>Inicie uma conversa para pedir orientação, esclarecer uma decisão ou solicitar que a Gestão consulte especialistas.</p></div>}</div>
    <form className="management-chat-form" onSubmit={submit}><label><span>Sua mensagem</span><ReferenceComposer value={content} onChange={setContent} references={references} onReferencesChange={setReferences} disabled={sending} placeholder="Converse com a Gestão. Use @ para acrescentar contexto do projeto." /></label><AttachmentPicker files={files} onChange={setFiles} disabled={sending} /><div><small>{feedback || "Esta mensagem cria uma execução de conversa, não uma tarefa do roteiro."}</small><button className="button button--gold" disabled={sending}>{sending ? "Enviando…" : "Enviar para Gestão"}</button></div></form>
  </section>;
}
