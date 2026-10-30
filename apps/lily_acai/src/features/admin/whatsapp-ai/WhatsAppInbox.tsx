import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadWhatsAppAISettings,
  loadWhatsAppConversation,
  loadWhatsAppInbox,
  loadWhatsAppKnowledge,
  replyWhatsAppConversation,
  saveWhatsAppKnowledge,
  setWhatsAppConversation,
  type WhatsAppAISettings,
  type WhatsAppConversation,
  type WhatsAppConversationMessage,
  type WhatsAppKnowledgeArticle
} from "./whatsapp-ai-api";
import "./WhatsAppInbox.css";

type Props = { csrfToken: string; isAdmin: boolean };

const statusLabel: Record<WhatsAppConversation["status"], string> = {
  ai: "IA atendendo", human: "Aguardando equipe", resolved: "Resolvida", opted_out: "Opt-out"
};

function expiresIn(value: string | null) {
  if (!value) return "Janela não disponível";
  const remaining = new Date(value).getTime() - Date.now();
  if (remaining <= 0) return "Janela de resposta encerrada";
  return `Janela livre por mais ${Math.ceil(remaining / 3_600_000)} h`;
}

export function WhatsAppInbox({ csrfToken, isAdmin }: Props) {
  const [settings, setSettings] = useState<WhatsAppAISettings | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<WhatsAppConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [articles, setArticles] = useState<WhatsAppKnowledgeArticle[]>([]);
  const [articleDraft, setArticleDraft] = useState<{ slug: string; title: string; body: string; status: "draft" | "published" | "archived" }>({ slug: "", title: "", body: "", status: "draft" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pendingReply = useRef<{ text: string; key: string } | null>(null);

  const refresh = useCallback(async () => {
    const [nextSettings, nextInbox, nextKnowledge] = await Promise.all([
      loadWhatsAppAISettings(), loadWhatsAppInbox(), loadWhatsAppKnowledge()
    ]);
    setSettings(nextSettings);
    setConversations(nextInbox.conversations);
    setArticles(nextKnowledge.articles);
    setSelectedId((current) => current && !nextInbox.conversations.some((item) => item.id === current) ? "" : current);
  }, []);

  useEffect(() => {
    let active = true;
    refresh().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o inbox."); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let active = true;
    loadWhatsAppConversation(selectedId).then((result) => { if (active) setMessages(result.messages); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível abrir a conversa."); });
    return () => { active = false; };
  }, [selectedId]);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  async function action(run: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await run(); await refresh(); setNotice(success); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "A operação não foi concluída."); }
    finally { setBusy(false); }
    return false;
  }

  async function changeStatus(status: "ai" | "human" | "resolved") {
    if (!selected) return;
    await action(() => setWhatsAppConversation(selected.id, csrfToken, { status }), `Conversa marcada como ${statusLabel[status].toLowerCase()}.`);
  }

  async function sendReply() {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    if (!pendingReply.current || pendingReply.current.text !== text) pendingReply.current = { text, key: crypto.randomUUID() };
    const completed = await action(() => replyWhatsAppConversation(selected.id, csrfToken, text, pendingReply.current!.key), "Resposta enviada.");
    if (completed) {
      const sent = await loadWhatsAppConversation(selected.id).catch(() => null);
      const matchingMessage = sent?.messages.find((message) => message.direction === "outbound" && message.text === text && message.status === "sent");
      if (matchingMessage) { setDraft(""); pendingReply.current = null; }
      else setError("O envio ainda não foi confirmado. Confira as mensagens antes de iniciar outra resposta.");
    }
    const result = await loadWhatsAppConversation(selected.id).catch(() => null);
    if (result) setMessages(result.messages);
  }

  async function saveArticle() {
    const completed = await action(() => saveWhatsAppKnowledge(csrfToken, articleDraft), "Artigo salvo na base de conhecimento.");
    if (completed) setArticleDraft({ slug: "", title: "", body: "", status: "draft" });
  }

  return <section className="whatsapp-ai-inbox" aria-labelledby="whatsapp-inbox-title">
    <header className="whatsapp-ai-heading">
      <div><span className="eyebrow">Atendimento assistido</span><h2 id="whatsapp-inbox-title">Inbox e agente IA</h2><p>Mensagens privadas ficam criptografadas e são removidas conforme a retenção configurada.</p></div>
      <button className="button ghost" type="button" onClick={() => void action(refresh, "Inbox atualizado.")} disabled={busy}>Atualizar</button>
    </header>
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="success">{notice}</p>}
    <div className="whatsapp-ai-metrics">
      <article><small>Inbox</small><strong>{settings?.inboxEnabled ? "Ativo" : "Desligado"}</strong></article>
      <article><small>Agente IA</small><strong>{settings?.aiEnabled ? "Ativo" : "Desligado"}</strong></article>
      <article><small>Fila humana</small><strong>{settings?.queue.humanQueue ?? 0}</strong></article>
      <article><small>Requisições hoje</small><strong>{settings?.usage.requests ?? 0} / {settings?.requestBudget ?? "—"}</strong></article>
    </div>
    {settings && (!settings.inboxEnabled || !settings.aiEnabled) && <p className="operation-warning">Atendimento real permanece protegido. Para ativar, configure inbox, retenção, chave de criptografia, credenciais Meta/OpenAI, orçamento diário e autorização para enviar mensagens de clientes à API de embeddings.</p>}
    <div className="whatsapp-ai-workspace">
      <aside className="whatsapp-ai-conversation-list" aria-label="Conversas">
        <h3>Conversas recentes</h3>
        {conversations.map((conversation) => <button key={conversation.id} type="button" className={selectedId === conversation.id ? "active" : ""} onClick={() => setSelectedId(conversation.id)}>
          <span className="whatsapp-ai-conversation-top"><strong>{conversation.contact}</strong><small>{statusLabel[conversation.status]}</small></span>
          <span className="whatsapp-ai-last-message">{conversation.lastMessage || "Sem mensagem"}</span>
          <time>{new Date(conversation.updatedAt).toLocaleString("pt-BR")}</time>
        </button>)}
        {conversations.length === 0 && <p>Nenhuma conversa armazenada.</p>}
      </aside>
      <div className="whatsapp-ai-chat">
        {selected ? <>
          <header><div><strong>{selected.contact}</strong><small>{statusLabel[selected.status]} · {expiresIn(selected.windowExpiresAt)}</small></div>
            <div className="admin-actions">
              {selected.status === "ai" && <button className="button ghost" type="button" disabled={busy} onClick={() => void changeStatus("human")}>Assumir atendimento</button>}
              {selected.status === "human" && <button className="button ghost" type="button" disabled={busy || !settings?.aiEnabled} onClick={() => void changeStatus("ai")}>Devolver à IA</button>}
              {selected.status !== "resolved" && selected.status !== "opted_out" && <button className="button ghost" type="button" disabled={busy} onClick={() => void changeStatus("resolved")}>Resolver</button>}
            </div>
          </header>
          <div className="whatsapp-ai-message-list" aria-live="polite">{messages.map((item) => <article key={item.id} className={`whatsapp-ai-message ${item.direction}`}><small>{item.direction === "inbound" ? "Cliente" : item.direction === "internal" ? "Nota interna" : "CookLily"} · {item.status}</small><p>{item.text}</p><time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time></article>)}</div>
          <form className="whatsapp-ai-reply" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}><label htmlFor="whatsapp-ai-reply-text">Resposta da equipe</label><textarea id="whatsapp-ai-reply-text" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} rows={3} disabled={selected.status !== "human" || !selected.windowExpiresAt || new Date(selected.windowExpiresAt) <= new Date()} placeholder="A resposta livre exige conversa humana e janela de 24 horas aberta." /><button className="button primary" type="submit" disabled={busy || !draft.trim() || selected.status !== "human" || !selected.windowExpiresAt || new Date(selected.windowExpiresAt) <= new Date()}>Enviar</button></form>
        </> : <div className="whatsapp-ai-empty"><strong>Selecione uma conversa</strong><p>O número aparece mascarado e o conteúdo só é revelado à equipe autenticada.</p></div>}
      </div>
    </div>
    <section className="whatsapp-ai-knowledge"><header><div><span className="eyebrow">RAG · fatos públicos</span><h3>Base de conhecimento</h3></div><span>{articles.length} artigos</span></header>
      <p>Somente informações públicas e revisadas entram na recuperação semântica. Publicar exige gerar o embedding com sucesso.</p>
      {articles.map((article) => <article key={article.id}><strong>{article.title}</strong><span>{article.status} · revisão {article.revision}</span><p>{article.body}</p></article>)}
      {isAdmin && <form onSubmit={(event) => { event.preventDefault(); void saveArticle(); }}><h4>Novo artigo</h4><div className="whatsapp-ai-knowledge-fields"><label>Slug<input required value={articleDraft.slug} onChange={(event) => setArticleDraft({ ...articleDraft, slug: event.target.value })} /></label><label>Título<input required minLength={3} maxLength={120} value={articleDraft.title} onChange={(event) => setArticleDraft({ ...articleDraft, title: event.target.value })} /></label></div><label>Conteúdo público<textarea required minLength={10} maxLength={8000} rows={4} value={articleDraft.body} onChange={(event) => setArticleDraft({ ...articleDraft, body: event.target.value })} /></label><label>Estado<select value={articleDraft.status} onChange={(event) => setArticleDraft({ ...articleDraft, status: event.target.value as "draft" | "published" | "archived" })}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label><button className="button primary" type="submit" disabled={busy}>Salvar artigo</button></form>}
    </section>
  </section>;
}
