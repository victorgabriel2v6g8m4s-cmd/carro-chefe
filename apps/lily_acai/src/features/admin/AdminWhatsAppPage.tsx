import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";
import { getWhatsAppNotifications, getWhatsAppSettings, getWhatsAppTemplates, mutateWhatsApp, type WhatsAppNotification, type WhatsAppSettings, type WhatsAppTemplate } from "./whatsapp-api";

type TemplateDraft = Omit<WhatsAppTemplate, "id" | "status" | "updatedAt" | "metaTemplateName"> & { metaTemplateName: string };
const emptyTemplate: TemplateDraft = { key: "", displayName: "", category: "utility", language: "pt_BR", bodyTemplate: "", variables: [], metaTemplateName: "" };
const label = (value: string) => value.replaceAll("_", " ");

export function AdminWhatsAppPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([]);
  const [filter, setFilter] = useState("failed");
  const [draft, setDraft] = useState(emptyTemplate);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = session?.user.role === "admin";

  const refresh = useCallback(async (auth = session) => {
    const current = auth ?? await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) throw new Error("Esta área exige perfil staff CookLily.");
    const [nextSettings, nextTemplates, nextNotifications] = await Promise.all([
      getWhatsAppSettings(), getWhatsAppTemplates(), getWhatsAppNotifications(filter)
    ]);
    setSession(current);
    setSettings(nextSettings);
    setTemplates(nextTemplates.templates);
    setNotifications(nextNotifications.notifications);
  }, [filter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLilySession().then((auth) => refresh(auth)).then(() => { if (active) setError(""); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível abrir a operação WhatsApp."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir a operação."); }
    finally { setBusy(false); }
  }

  function editTemplate(item: WhatsAppTemplate) {
    setEditing(item.id);
    setDraft({ key: item.key, displayName: item.displayName, category: item.category, language: item.language, bodyTemplate: item.bodyTemplate, variables: item.variables, metaTemplateName: item.metaTemplateName ?? "" });
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    await run(async () => {
      const body = { ...draft, metaTemplateName: draft.metaTemplateName || null, status: "draft" as const };
      if (editing) await mutateWhatsApp(`templates/${encodeURIComponent(editing)}`, "PATCH", session.csrfToken, body);
      else await mutateWhatsApp("templates", "POST", session.csrfToken, body);
      setDraft(emptyTemplate); setEditing(null);
    }, editing ? "Template atualizado como rascunho." : "Template cadastrado como rascunho.");
  }

  async function changeTemplateStatus(item: WhatsAppTemplate, status: WhatsAppTemplate["status"]) {
    if (!session) return;
    await run(async () => { await mutateWhatsApp(`templates/${encodeURIComponent(item.id)}`, "PATCH", session.csrfToken, { status }); }, `Template ${status === "active" ? "ativado" : status === "archived" ? "arquivado" : "salvo como rascunho"}.`);
  }

  async function retry(id?: string) {
    if (!session) return;
    await run(async () => { await mutateWhatsApp("retry", "POST", session.csrfToken, id ? { notificationId: id } : {}); }, "Fila de retry atualizada.");
  }

  if (loading) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando operação WhatsApp" /></section>;
  if (!session || !settings) return <section className="admin-state"><span className="eyebrow">CookLily · WhatsApp</span><h1>Acesso staff necessário.</h1><p>{error}</p><Link className="button primary" to="/entrar?next=/painel/whatsapp">Entrar</Link></section>;

  const webhookUrl = `${window.location.origin}/api/v1/integrations/whatsapp/webhook`;
  const configuredItems = [
    ["Provider Meta Cloud", settings.provider === "meta_cloud"],
    ["Token de acesso", settings.credentials.accessTokenConfigured],
    ["ID do número", settings.credentials.phoneNumberIdConfigured],
    ["Versão Graph", settings.credentials.graphVersionConfigured],
    ["Template padrão e idioma", settings.credentials.templateConfigured && settings.credentials.languageConfigured],
    ["Verify token do webhook", settings.webhook.verifyTokenConfigured],
    ["App Secret para assinatura", settings.webhook.appSecretConfigured]
  ] as const;

  return <section className="admin-page wide whatsapp-admin-page">
    <div className="admin-heading"><div><span className="eyebrow">CookLily · integrações</span><h1>WhatsApp Cloud API</h1><p>Operação de templates, webhook e notificações transacionais.</p></div><div className="admin-actions"><Link className="button ghost" to="/painel">Resumo</Link><Link className="button ghost" to="/painel/saude">Saúde</Link></div></div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}

    <div className="observability-status-row whatsapp-status-row"><article className={settings.ready ? "" : "warn"}><small>Envio</small><strong>{settings.ready ? "Configuração presente" : "Desativado · fail-closed"}</strong></article><article><small>Templates cadastrados</small><strong>{settings.templates.total}</strong></article><article><small>Consentimento transacional</small><strong>{settings.consentVersion}</strong></article></div>
    {!settings.ready && <p className="operation-warning">O envio está protegido e permanece desligado até a configuração Meta completa no ambiente seguro da VPS. Esta página não recebe nem exibe segredos.</p>}

    <section className="analytics-panel whatsapp-config-panel"><div className="analytics-panel-heading"><div><span className="eyebrow">Configuração protegida</span><h2>Checklist de conexão</h2></div></div><ul className="whatsapp-checklist">{configuredItems.map(([name, ready]) => <li key={name}><span aria-hidden="true" className={ready ? "whatsapp-check good" : "whatsapp-check"}>{ready ? "✓" : "•"}</span><span>{name}</span><strong>{ready ? "Configurado" : "Pendente"}</strong></li>)}</ul><label>Callback HTTPS para configurar no Meta<textarea readOnly rows={2} value={webhookUrl} onFocus={(event) => event.currentTarget.select()} /></label><small>Depois de configurar o servidor e o painel Meta, confira o handshake e o recebimento de eventos antes de habilitar envio real.</small></section>

    <section className="analytics-panel whatsapp-queue-panel"><div className="analytics-panel-heading"><div><span className="eyebrow">Notificações transacionais</span><h2>Fila de saída</h2></div><div className="admin-actions"><select aria-label="Filtrar notificações" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Todos os estados</option>{["pending", "processing", "sent", "failed", "dead", "skipped"].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><button className="button ghost" type="button" onClick={() => void refresh()} disabled={busy}>Atualizar</button>{isAdmin && <button className="button primary" type="button" onClick={() => void retry()} disabled={busy || (settings.queue.failed + settings.queue.dead === 0)}>Tentar novamente falhas</button>}</div></div><div className="observability-metrics"><div><span>Pendentes</span><strong>{settings.queue.pending}</strong></div><div><span>Falhas recuperáveis</span><strong>{settings.queue.failed}</strong></div><div><span>Falhas finais</span><strong>{settings.queue.dead}</strong></div></div>
      <div className="whatsapp-table-wrap"><table className="whatsapp-table"><thead><tr><th>Pedido</th><th>Etapa</th><th>Estado</th><th>Tentativas</th><th>Última falha</th><th>Atualizado</th><th></th></tr></thead><tbody>{notifications.map((item) => <tr key={item.id}><td>{item.orderNumber}</td><td>{label(item.stage)}</td><td>{label(item.status)}</td><td>{item.attempts}</td><td>{item.lastErrorCode ?? "—"}</td><td>{new Date(item.sentAt ?? item.nextAttemptAt ?? item.createdAt).toLocaleString("pt-BR")}</td><td>{isAdmin && ["failed", "dead"].includes(item.status) && <button className="button ghost" type="button" disabled={busy} onClick={() => void retry(item.id)}>Retry</button>}</td></tr>)}{notifications.length === 0 && <tr><td colSpan={7}>Nenhuma notificação neste filtro.</td></tr>}</tbody></table></div><small>Texto de mensagem, telefones e detalhes brutos do provider não são exibidos nesta tela.</small>
    </section>

    <section className="whatsapp-template-layout"><div className="analytics-panel"><div className="analytics-panel-heading"><div><span className="eyebrow">Biblioteca</span><h2>Templates CookLily</h2></div></div>{templates.map((item) => <article className="whatsapp-template-card" key={item.id}><div><strong>{item.displayName}</strong><small>{item.key} · {item.category} · {item.language} · {item.status}</small><p>{item.bodyTemplate}</p><small>Meta: {item.metaTemplateName || "não associado"}</small></div><div className="admin-actions"><button className="button ghost" type="button" disabled={!isAdmin || busy} onClick={() => editTemplate(item)}>Editar</button>{isAdmin && item.status !== "active" && item.status !== "archived" && <button className="button primary" type="button" disabled={busy || !item.metaTemplateName} title={!item.metaTemplateName ? "Associe o nome de um template já aprovado na Meta" : undefined} onClick={() => void changeTemplateStatus(item, "active")}>Ativar</button>}{isAdmin && item.status === "active" && <button className="button ghost" type="button" disabled={busy} onClick={() => void changeTemplateStatus(item, "draft")}>Desativar</button>}{isAdmin && item.status !== "archived" && <button className="button ghost" type="button" disabled={busy} onClick={() => void changeTemplateStatus(item, "archived")}>Arquivar</button>}</div></article>)}{templates.length === 0 && <p>Nenhum template cadastrado ainda.</p>}</div>
      <form className="analytics-panel whatsapp-template-form" onSubmit={saveTemplate}><div className="analytics-panel-heading"><div><span className="eyebrow">{editing ? "Edição" : "Novo registro"}</span><h2>{editing ? "Editar template" : "Cadastrar template"}</h2></div></div>{isAdmin ? <><label>Chave técnica<input required minLength={2} maxLength={80} pattern="[a-z0-9][a-z0-9_]*" value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} disabled={Boolean(editing)} /></label><label>Nome de exibição<input required maxLength={120} value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label><label>Categoria<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as typeof draft.category })}><option value="utility">Utility</option><option value="marketing">Marketing</option><option value="authentication">Authentication</option></select></label><label>Idioma<input required pattern="[a-z]{2}_[A-Z]{2}" value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })} /></label><label>Corpo de referência<textarea required rows={4} maxLength={4000} value={draft.bodyTemplate} onChange={(event) => setDraft({ ...draft, bodyTemplate: event.target.value })} /></label><fieldset><legend>Variáveis posicionais</legend>{(["orderNumber", "stageLabel"] as const).map((name) => <label className="toggle" key={name}><input type="checkbox" checked={draft.variables.includes(name)} onChange={(event) => setDraft({ ...draft, variables: event.target.checked ? [...draft.variables, name] : draft.variables.filter((value) => value !== name) })} />{name === "orderNumber" ? "Número do pedido" : "Etapa do pedido"}</label>)}</fieldset><label>Nome aprovado no Meta (opcional)<input maxLength={512} pattern="[a-z0-9_]+" value={draft.metaTemplateName} onChange={(event) => setDraft({ ...draft, metaTemplateName: event.target.value })} /><small>O cadastro não cria nem aprova o template no WhatsApp Manager. Ative somente após conferir nome, idioma e variáveis.</small></label><div className="admin-actions"><button className="button primary" disabled={busy}>{editing ? "Salvar como rascunho" : "Cadastrar rascunho"}</button>{editing && <button className="button ghost" type="button" disabled={busy} onClick={() => { setEditing(null); setDraft(emptyTemplate); }}>Cancelar edição</button>}</div></> : <p>Somente admins podem cadastrar ou alterar templates. Sua conta pode consultar o estado e a fila.</p>}</form>
    </section>
  </section>;
}
