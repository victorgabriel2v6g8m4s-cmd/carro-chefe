import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getLilyCatalog, getLilyProfile, getLilySession, type AuthPayload, type CatalogProduct, type LilyProfilePayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";
import { getCustomerOrders } from "../orders/api";
import { surveyJson, type CustomerNotification, type SurveyDefinition, type SurveyQuestion } from "./api";
import { QuestionInput } from "./QuestionInput";

type SurveyRow = { id: string; title: string; subtitle: string | null; description: string | null; estimatedMinutes?: number; questionCount?: number; points: number | null; showPoints?: boolean; definition?: SurveyDefinition; status?: string; version?: number };
const labels: Record<string, string> = { single_choice:"Seleção única", multiple_choice:"Seleção múltipla", free_text:"Texto livre", media:"Mídia", choice_text:"Seleção + texto", binary_swipe:"Positivo / negativo", short_answer:"Resposta curta", paragraph:"Parágrafo", checkboxes:"Caixas de seleção", dropdown:"Lista suspensa", linear_scale:"Escala linear", multiple_choice_grid:"Grade de múltipla escolha", checkbox_grid:"Grade de caixas de seleção", date:"Data", datetime:"Data e hora" };

function safeMarkdown(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]!)).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, "<code>$1</code>"); }
function hasAnswer(question: SurveyQuestion, value: unknown) { if (question.type === "free_text" && question.media && value && typeof value === "object") { const answer = value as { text?: string; upload?: { uploadId?: string } }; return Boolean(answer.text?.trim() || answer.upload?.uploadId); } if (question.type === "media" && value && typeof value === "object") return typeof (value as { uploadId?: unknown }).uploadId === "string"; return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : Boolean(value && typeof value === "object" ? Object.keys(value).length : value); }

function AuthRequired() { return <section className="survey-state"><span className="eyebrow">Pesquisas CookLily</span><h1>Entre para participar.</h1><p>Suas respostas só ficam vinculadas à sua conta se você autorizar isso no envio.</p><Link className="button primary" to={`/entrar?next=${encodeURIComponent(window.location.pathname)}`}>Entrar</Link></section>; }

export function SurveyListPage() {
  const [auth, setAuth] = useState<AuthPayload | null | undefined>(undefined);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { getLilySession().then(setAuth).catch(() => setAuth(null)); }, []);
  useEffect(() => { if (auth) surveyJson<{ surveys: SurveyRow[] }>("surveys").then((data) => setSurveys(data.surveys)).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as pesquisas.")); }, [auth]);
  if (auth === undefined) return <section className="survey-state"><LilyLoadingSpinner size="lg" label="Carregando pesquisas" /></section>;
  if (!auth) return <AuthRequired />;
  return <section className="survey-page"><span className="eyebrow">CookLily · pontos e missões</span><h1>Pesquisas rápidas</h1><p>Responda às pesquisas disponíveis e desbloqueie novas missões.</p>{error && <p className="error" role="alert">{error}</p>}{surveys.length ? <div className="survey-list">{surveys.map((survey) => <article className="survey-card" key={survey.id}><div><span className="eyebrow">{survey.questionCount} perguntas</span><h2>{survey.title}</h2>{survey.subtitle && <p>{survey.subtitle}</p>}{survey.description && <p>{survey.description}</p>}<div className="notification-kpis">{survey.estimatedMinutes && <span>◷ {survey.estimatedMinutes} min</span>}{survey.points !== null && survey.points > 0 && <span>✦ {survey.points.toLocaleString("pt-BR")} pontos</span>}</div></div><Link className="button primary" to={`/pesquisas/${encodeURIComponent(survey.id)}`}>Responder</Link></article>)}</div> : <div className="survey-state"><h2>Nenhuma pesquisa disponível agora.</h2><p>Volte mais tarde para conferir novas oportunidades.</p></div>}</section>;
}

export function SurveyRespondPage() {
  const { id = "" } = useParams();
  const [auth, setAuth] = useState<AuthPayload | null | undefined>(undefined); const [survey, setSurvey] = useState<(SurveyDefinition & { version: number }) | null>(null);
  const [participationId, setParticipationId] = useState(""); const [answers, setAnswers] = useState<Record<string, unknown>>({}); const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState<{ pointsAwarded: number; currentPoints: number; unlockedMissions: Array<{ id: string; title: string; points: number }> } | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [consent, setConsent] = useState(false); const [current, setCurrent] = useState(0);
  useEffect(() => { getLilySession().then(setAuth).catch(() => setAuth(null)); }, []);
  useEffect(() => { if (!auth) return; surveyJson<{ participationId: string; survey: SurveyDefinition & { version: number }; progressTarget: null | { label: string; remaining: number } }>(`surveys/${encodeURIComponent(id)}/start`, { method: "POST", headers: { "X-Lily-CSRF": auth.csrfToken }, body: "{}" }).then((started) => { setSurvey(started.survey); setParticipationId(started.participationId); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível abrir a pesquisa.")); }, [auth, id]);
  const answered = useMemo(() => survey?.questions.filter((question) => hasAnswer(question, answers[question.id])).length ?? 0, [survey, answers]);
  const percent = survey ? Math.round(answered / survey.questions.length * 100) : 0;
  useEffect(() => { if (!survey || !participationId) return; setProgress(percent); const timer = window.setTimeout(() => { void surveyJson(`surveys/${encodeURIComponent(id)}/progress`, { method: "POST", headers: { "X-Lily-CSRF": auth?.csrfToken ?? "" }, body: JSON.stringify({ participationId, answers }) }).catch(() => undefined); }, 450); return () => window.clearTimeout(timer); }, [percent, answers, survey, participationId, id, auth]);
  useEffect(() => { if (!survey || !survey.allowNavigation || reward) return; const onBeforeUnload = (event: BeforeUnloadEvent) => { if (answered) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", onBeforeUnload); return () => window.removeEventListener("beforeunload", onBeforeUnload); }, [survey, reward, answered]);
  if (auth === undefined) return <section className="survey-state"><LilyLoadingSpinner size="lg" label="Carregando pesquisa" /></section>;
  if (!auth) return <AuthRequired />;
  async function submit(event: FormEvent) { event.preventDefault(); if (!survey || !participationId) return; setBusy(true); setError(""); try { const result = await surveyJson<{ completed: boolean; pointsAwarded: number; currentPoints: number; unlockedMissions: Array<{ id: string; title: string; points: number }> }>(`surveys/${encodeURIComponent(id)}/submit`, { method: "POST", headers: { "X-Lily-CSRF": auth!.csrfToken }, body: JSON.stringify({ participationId, answers, consentToLinkAnswers: consent }) }); setReward(result); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar suas respostas."); } finally { setBusy(false); } }
  if (error && !survey) return <section className="survey-state"><h1>Pesquisa indisponível</h1><p role="alert">{error}</p><Link className="button ghost" to="/pesquisas">Voltar às pesquisas</Link></section>;
  if (reward) return <section className="survey-reward" aria-live="polite"><div className="reward-glow" aria-hidden="true">✦</div><span className="eyebrow">Pesquisa concluída</span><h1>Mandou bem!</h1><p>Obrigado por compartilhar sua opinião.</p>{reward.pointsAwarded > 0 && <div className="reward-points"><strong>+{reward.pointsAwarded}</strong><span>pontos ganhos</span><small>Seu saldo agora é {reward.currentPoints} pontos</small></div>}{reward.unlockedMissions.length > 0 && <div className="survey-unlocked"><h2>Nova missão desbloqueada</h2>{reward.unlockedMissions.map((mission) => <p key={mission.id}>{mission.title} · {mission.points} pontos</p>)}</div>}<p className="reward-note">{reward.pointsAwarded > 0 ? "Cada resposta aproxima você de novas experiências CookLily." : "Sua participação nos ajuda a melhorar a CookLily."}</p><div className="survey-actions"><Link className="button primary" to="/dashboard">Continuar</Link><Link className="button ghost" to="/pesquisas">Ver outras pesquisas</Link></div></section>;
  if (!survey) return <section className="survey-state"><LilyLoadingSpinner size="lg" label="Abrindo pesquisa" /></section>;
  const questions = survey.questions; const visible = survey.allowNavigation ? questions : [questions[current]].filter(Boolean);
  return <section className="survey-page"><Link className="survey-back" to="/pesquisas">← Pesquisas</Link><span className="eyebrow">Pesquisa CookLily</span><h1>{survey.title}</h1>{survey.subtitle && <h2>{survey.subtitle}</h2>}{survey.description && <p>{survey.description}</p>}<div className="survey-progress" role="progressbar" aria-label="Progresso da pesquisa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><p className="survey-progress-copy">{progress}% respondido · {answered} de {questions.length} perguntas</p>{survey.showPoints && ((survey.pointsPerForm ?? 0) + (survey.pointsPerAnswer ?? 0) * questions.length) > 0 && <p className="survey-points-hint">Esta pesquisa oferece até {((survey.pointsPerForm ?? 0) + (survey.pointsPerAnswer ?? 0) * questions.length).toLocaleString("pt-BR")} pontos.</p>}
    <form className="survey-form" onSubmit={(event) => void submit(event)}>{visible.map((question) => <SurveyQuestionField key={question.id} question={question} value={answers[question.id]} surveyId={id} onChange={(value) => setAnswers((old) => ({ ...old, [question.id]: value }))} />)}<div className="survey-consent"><label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Autorizo vincular minhas respostas a esta conta para análise pela equipe. Sem esta autorização, as respostas serão salvas sem identificação da conta.</span></label></div>{error && <p className="error" role="alert">{error}</p>}<div className="survey-actions">{!survey.allowNavigation && current > 0 && <button className="button ghost" type="button" onClick={() => setCurrent((value) => value - 1)}>Anterior</button>}{!survey.allowNavigation && current < questions.length - 1 ? <button className="button primary" type="button" onClick={() => { const q = questions[current]; if (q.required && !answers[q.id]) { setError("Responda esta pergunta para continuar."); return; } setError(""); setCurrent((value) => value + 1); }}>Próxima</button> : <button className="button primary" type="submit" disabled={busy}>{busy ? "Salvando…" : "Concluir pesquisa"}</button>}</div></form>
  </section>;
}

function SurveyQuestionField({ question, value, onChange, surveyId }: { question: SurveyQuestion; value: unknown; onChange: (value: unknown) => void; surveyId: string }) {
  return <fieldset className={`survey-question font-${question.style?.fontSize ?? "md"} ${question.style?.bold ? "is-bold" : ""} ${question.style?.italic ? "is-italic" : ""}`}><legend>{question.style?.markdown ? <span dangerouslySetInnerHTML={{ __html: safeMarkdown(question.title) }} /> : question.title}{question.required && <span aria-label="obrigatória"> *</span>}</legend>{question.description && (question.style?.markdown ? <p dangerouslySetInnerHTML={{ __html: safeMarkdown(question.description) }} /> : <p>{question.description}</p>)}{question.style?.html && <div className="survey-question-html" dangerouslySetInnerHTML={{ __html: question.style.html }} />}{<QuestionInput question={question} value={value} onChange={onChange} surveyId={surveyId} />}</fieldset>;
}

export { AdminSurveysPage } from "./SurveyBuilder";

function findUploadedAnswers(value: unknown): Array<{ uploadId: string; name: string }> {
  if (Array.isArray(value)) return value.flatMap(findUploadedAnswers);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const current = typeof record.uploadId === "string" ? [{ uploadId: record.uploadId, name: typeof record.name === "string" ? record.name : "Anexo" }] : [];
  return [...current, ...Object.values(record).flatMap(findUploadedAnswers)];
}

export function AdminSurveyResponsesPage() {
  const { id = "" } = useParams(); const [payload, setPayload] = useState<{ responses: Array<{ id: string; submittedAt: string; consented: boolean; respondent: null | { displayName: string | null; phoneNormalized: string }; answers: Record<string, unknown> }> } | null>(null); const [error,setError]=useState("");
  useEffect(() => { surveyJson<typeof payload extends infer T ? NonNullable<T> : never>(`admin/surveys/${encodeURIComponent(id)}/responses`).then(setPayload).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar respostas.")); }, [id]);
  return <section className="survey-admin"><div className="admin-heading"><div><span className="eyebrow">Acesso restrito à equipe</span><h1>Respostas da pesquisa</h1></div><Link className="button ghost" to="/painel/pesquisas">Voltar</Link></div>{error && <p className="error" role="alert">{error}</p>}{payload?.responses.map((row) => <article className="survey-response" key={row.id}><strong>{new Date(row.submittedAt).toLocaleString("pt-BR")}</strong><p>{row.consented ? `Vinculada por consentimento: ${row.respondent?.displayName ?? "Cliente"} · ${row.respondent?.phoneNormalized ?? ""}` : "Resposta sem vínculo à conta"}</p><pre>{JSON.stringify(row.answers,null,2)}</pre>{findUploadedAnswers(row.answers).map((file) => <a key={file.uploadId} href={`/api/v1/lily/admin/survey-uploads/${encodeURIComponent(file.uploadId)}`}>{file.name} · baixar</a>)}</article>)}</section>;
}

export function DashboardPage() { const [profile,setProfile]=useState<LilyProfilePayload|null>(null); useEffect(()=>{getLilyProfile().then(setProfile).catch(()=>setProfile(null));},[]); return <section className="survey-page"><span className="eyebrow">CookLily · Dashboard</span><h1>Seu espaço CookLily.</h1><p>Acompanhe pedidos, pontos e missões disponíveis.</p>{profile && <div className="admin-kpis"><article><strong>{profile.loyalty.points}</strong><span>pontos disponíveis</span></article><article><strong>{profile.loyalty.orderCount}</strong><span>pedidos</span></article>{profile.loyalty.rank !== null && <article><strong>{profile.loyalty.rank}</strong><span>posição no ranking</span></article>}</div>}<div className="survey-actions"><Link className="button primary" to="/pedidos">Meus pedidos</Link><Link className="button ghost" to="/pesquisas">Pesquisas</Link><Link className="button ghost" to="/ranking">Meu ranking</Link><Link className="button ghost" to="/perfil">Editar perfil</Link></div><MissionList /></section>; }

function MissionList() { const [missions,setMissions]=useState<Array<{id:string;title:string;description:string|null;points:number}>>([]); useEffect(()=>{surveyJson<{missions:typeof missions}>("missions").then((data)=>setMissions(data.missions)).catch(()=>setMissions([]));},[]); return <div className="survey-list"><h2>Missões disponíveis</h2>{missions.length ? missions.map((mission)=><article className="survey-card" key={mission.id}><div><h3>{mission.title}</h3>{mission.description && <p>{mission.description}</p>}<strong>{mission.points} pontos</strong></div></article>) : <p>Nenhuma missão disponível no momento.</p>}</div>; }

export function ReelsPage() { const [products,setProducts]=useState<CatalogProduct[]>([]); useEffect(()=>{getLilyCatalog({limit:30}).then((data)=>setProducts(data.products)).catch(()=>setProducts([]));},[]); return <section className="reels-page"><span className="eyebrow">CookLily · descubra</span><h1>Reels de produtos</h1><div className="reels-list">{products.map((product)=><article className="reel-card" key={product.id}>{product.cover && <img loading="lazy" src={product.cover.url} alt={product.cover.altText} onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=`${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`;}} />}<div><h2>{product.displayName}</h2>{product.description && <p>{product.description}</p>}<Link className="button primary" to={`/cardapio?produto=${encodeURIComponent(product.slug)}`}>Ver produto</Link></div></article>)}</div>{products.length===0 && <p>Os produtos aparecerão aqui quando o catálogo estiver disponível.</p>}</section>; }

export function NotificationsPage() {
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string; status: string; operationUpdatedAt: string }>>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([getCustomerOrders(), surveyJson<{ notifications: CustomerNotification[] }>("notifications?limit=50")])
      .then(([orderData, notificationData]) => { setOrders(orderData.orders); setNotifications(notificationData.notifications); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Entre na sua conta para ver atualizações."));
  }, []);
  async function openNotification(notification: CustomerNotification) {
    if (!notification.readAt) {
      try { await surveyJson(`notifications/${encodeURIComponent(notification.id)}/read`, { method: "POST", headers: { "X-Lily-CSRF": (await getLilySession()).csrfToken }, body: "{}" }); } catch { /* Keep navigation available if marking read fails. */ }
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    }
  }
  return <section className="survey-page"><span className="eyebrow">Atualizações CookLily</span><h1>Notificações</h1>{error && <p role="alert">{error}</p>}
    {notifications.map((notification) => <article className={`survey-card notification-card ${notification.readAt ? "is-read" : "is-unread"}`} key={notification.id}>
      <div><strong>{notification.title}</strong><p>{notification.body}</p>{notification.metadata.estimatedMinutes && <div className="notification-kpis"><span>◷ {notification.metadata.estimatedMinutes} min</span>{notification.metadata.questionCount && <span>{notification.metadata.questionCount} perguntas</span>}{typeof notification.metadata.points === "number" && notification.metadata.points > 0 && <span>✦ {notification.metadata.points.toLocaleString("pt-BR")} pontos</span>}</div>}</div>
      {notification.metadata.surveyId && <Link className="button primary" to={`/pesquisas/${encodeURIComponent(notification.metadata.surveyId)}`} onClick={() => void openNotification(notification)}>Responder</Link>}
    </article>)}
    {orders.slice(0, 20).map((order) => <article className="survey-card" key={order.id}><div><strong>Pedido {order.orderNumber}</strong><p>Status: {order.status.replaceAll("_", " ")}</p><small>Atualizado em {new Date(order.operationUpdatedAt).toLocaleString("pt-BR")}</small></div><Link className="button ghost" to={`/pedidos/${encodeURIComponent(order.id)}`}>Acompanhar</Link></article>)}
    {!notifications.length && !orders.length && !error && <p>Você ainda não tem atualizações recentes.</p>}
  </section>;
}
