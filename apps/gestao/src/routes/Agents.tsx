import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { AgentInspector } from "../components/AgentInspector";
import { StatusBadge } from "../components/StatusBadge";

const activeStatuses = new Set(["queued", "running", "waiting_input"]);

function RunList({ runs, empty }: { runs: any[]; empty: string }) {
  return runs.length ? <div className="item-list">{runs.map((run) => <Link className="item-row run-row" key={run.id} to={`/gestao/agentes/execucoes/${run.id}`}><span><strong>{run.title}</strong><small>{run.agent?.name} · {run.task?.title}</small><small>{run.currentStep || `Criada ${formatDate(run.createdAt)}`}</small></span><StatusBadge status={run.status} /></Link>)}</div> : <p className="muted">{empty}</p>;
}

export function Agents() {
  const { data, loading, refresh } = useData();
  const [params] = useSearchParams();
  const prefilledTask = useRef<string | null>(null);
  const delegationForm = useRef<HTMLElement>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [taskId, setTaskId] = useState(params.get("taskId") ?? "");
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [provider, setProvider] = useState("codex-local");
  const [feedback, setFeedback] = useState("");
  const [communications, setCommunications] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  useEffect(() => { api<any[]>("/api/v1/agents").then((items) => { setAgents(items); setAgentId((value) => value || items[0]?.id || ""); }); }, []);
  useEffect(() => {
    const loadCommunications = () => api<any[]>("/api/v1/agent-communications?limit=200").then(setCommunications);
    void loadCommunications(); const events = new EventSource("/api/v1/events"); events.addEventListener("agent.communication.created", loadCommunications); return () => events.close();
  }, []);
  useEffect(() => {
    if (!data || !taskId || prefilledTask.current === taskId) return;
    const task = data.tasks.find((item) => item.id === taskId); if (!task) return;
    setAgentId(task.ownerAgentId); setTitle(`Executar ${task.id} — ${task.title}`);
    setObjective(`Objetivo: concluir “${task.title}”.\n\nCritério de sucesso: ${task.acceptance}\n\nRegistrar o procedimento, as evidências e qualquer decisão necessária na Central Operacional.`);
    prefilledTask.current = taskId;
    const timer = setTimeout(() => {
      const form = delegationForm.current; if (!form) return;
      window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 18, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      form.querySelector<HTMLElement>("select")?.focus({ preventScroll: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [data, taskId]);
  const activeRuns = useMemo(() => data?.runs.filter((run) => activeStatuses.has(run.status)) ?? [], [data]);
  const completedRuns = useMemo(() => data?.runs.filter((run) => !activeStatuses.has(run.status)) ?? [], [data]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setFeedback("");
    try { const run = await api<any>("/api/v1/agent-runs", json("POST", { taskId, agentId, title, objective, provider, requestedBy: "PROPRIETARIO" })); setFeedback(`Execução ${run.id} criada e adicionada à fila.`); await refresh(); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  if (loading || !data) return <section className="panel loading">Carregando agentes…</section>;
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Orquestração assistida</span><h2>Agentes ligados ao plano</h2><p>Acompanhe execuções, histórico, terminal, perguntas, resultados, consumo e fluxo de comunicação.</p></section>
    <AgentFlowMap agents={agents} communications={communications} onAgentClick={setSelectedAgent} />
    <section className="agent-grid">{agents.map((agent) => { const running = activeRuns.filter((run) => run.agentId === agent.id); return <button type="button" className="panel agent-card" key={agent.id} onClick={() => setSelectedAgent(agent.id)}><small>{agent.id}</small><h3>{agent.name}</h3><p>{agent.mission}</p><span className={`agent-state ${running.length ? "is-running" : ""}`}><i /> {running.length ? `${running.length} em execução` : agent.enabled ? "Disponível" : "Desativado"}</span></button>; })}</section>
    <div className="content-grid agents-work"><div className="page-stack"><section className="panel"><div className="section-title"><div><span className="eyebrow">Agora</span><h3>Em execução</h3></div><span className="count-chip">{activeRuns.length}</span></div><RunList runs={activeRuns} empty="Nenhum agente está executando uma tarefa agora." /></section><section className="panel"><div className="section-title"><div><span className="eyebrow">Registro operacional</span><h3>Execuções anteriores</h3></div><span className="count-chip">{completedRuns.length}</span></div><RunList runs={completedRuns} empty="O histórico aparecerá após a primeira execução." /></section></div>
      <aside ref={delegationForm} id="delegar" className="panel delegation-form"><span className="eyebrow">Nova delegação</span><h3>Criar execução</h3><p className="muted">Ao escolher uma tarefa, a C.O. preenche agente, título e critério de sucesso e traz este formulário para a área visível.</p><form className="form-stack" onSubmit={submit}><label><span>Tarefa</span><select required value={taskId} onChange={(event) => { prefilledTask.current = null; setTaskId(event.target.value); }}><option value="">Selecione</option>{data.tasks.map((task) => <option key={task.id} value={task.id}>{task.id} · {task.title}</option>)}</select></label><label><span>Agente</span><select required value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label><label><span>Título da execução</span><input required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><span>Objetivo e critério de sucesso</span><textarea required minLength={10} value={objective} onChange={(event) => setObjective(event.target.value)} /></label><label><span>Executor</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="codex-local">Codex local (ponte)</option><option value="manual">Registro manual</option></select></label>{feedback && <p className="form-feedback" role="status">{feedback}</p>}<button className="button button--gold">Adicionar à fila</button></form></aside>
    </div><AgentInspector agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
  </div>;
}
