import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { AgentInspector } from "../components/AgentInspector";
import { StatusBadge } from "../components/StatusBadge";
import { messages } from "../i18n";
import type { Agent, AgentCommunication, AgentRun } from "../types";

const activeStatuses = new Set(["queued", "running", "waiting_input"]);

function RunList({ runs, empty }: { runs: AgentRun[]; empty: string }) {
  return runs.length ? <div className="item-list">{runs.map((run) => <Link className="item-row run-row" key={run.id} to={`/gestao/agentes/execucoes/${run.id}`}><span><strong>{run.title}</strong><small>{run.agent?.name} · {run.task?.title}</small><small>{run.currentStep || `Criada ${formatDate(run.createdAt)}`}</small></span><StatusBadge status={run.status} /></Link>)}</div> : <p className="muted">{empty}</p>;
}

export function Agents() {
  const { data, loading, refresh } = useData();
  const [params] = useSearchParams();
  const prefilledTask = useRef<string | null>(null);
  const delegationForm = useRef<HTMLElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [taskId, setTaskId] = useState(params.get("taskId") ?? "");
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [provider, setProvider] = useState("codex-local");
  const [feedback, setFeedback] = useState("");
  const [communications, setCommunications] = useState<AgentCommunication[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  useEffect(() => { api<Agent[]>("/api/v1/agents").then((items) => { setAgents(items); setAgentId((value) => value || items[0]?.id || ""); }); }, []);
  useEffect(() => {
    const loadCommunications = () => api<AgentCommunication[]>("/api/v1/agent-communications?limit=200").then(setCommunications);
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
    try { const run = await api<Pick<AgentRun, "id">>("/api/v1/agent-runs", json("POST", { taskId, agentId, title, objective, provider, requestedBy: "PROPRIETARIO" })); setFeedback(`Execução ${run.id} criada e adicionada à fila.`); await refresh(); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  if (loading || !data) return <section className="panel loading">{messages.common.states.loadingData}</section>;
  return <div className="page-stack"><section className="intro"><span className="eyebrow">{messages.agents.eyebrow}</span><h2>{messages.agents.title}</h2><p>{messages.agents.intro}</p></section>
    <AgentFlowMap agents={agents} communications={communications} onAgentClick={setSelectedAgent} />
    <section className="agent-grid">{agents.map((agent) => { const running = activeRuns.filter((run) => run.agentId === agent.id); return <button type="button" className="panel agent-card" key={agent.id} onClick={() => setSelectedAgent(agent.id)}><small>{agent.id}</small><h3>{agent.name}</h3><p>{agent.mission}</p><span className={`agent-state ${running.length ? "is-running" : ""}`}><i /> {running.length ? `${running.length} ${messages.agents.running}` : agent.enabled ? messages.agents.available : messages.agents.disabled}</span></button>; })}</section>
    <div className="content-grid agents-work"><div className="page-stack"><section className="panel"><div className="section-title"><div><span className="eyebrow">{messages.agents.now}</span><h3>{messages.agents.activeExecutions}</h3></div><span className="count-chip">{activeRuns.length}</span></div><RunList runs={activeRuns} empty={messages.agents.noActive} /></section><section className="panel"><div className="section-title"><div><span className="eyebrow">{messages.agents.operationalRecord}</span><h3>{messages.agents.finishedExecutions}</h3></div><span className="count-chip">{completedRuns.length}</span></div><RunList runs={completedRuns} empty={messages.agents.noFinished} /></section></div>
      <aside ref={delegationForm} id="delegar" className="panel delegation-form"><span className="eyebrow">{messages.agents.newDelegation}</span><h3>{messages.agents.createExecution}</h3><p className="muted">{messages.agents.delegationHelp}</p><form className="form-stack" onSubmit={submit}><label><span>{messages.agents.task}</span><select required value={taskId} onChange={(event) => { prefilledTask.current = null; setTaskId(event.target.value); }}><option value="">{messages.agents.select}</option>{data.tasks.map((task) => <option key={task.id} value={task.id}>{task.id} · {task.title}</option>)}</select></label><label><span>{messages.agents.agent}</span><select required value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label><label><span>{messages.agents.executionTitle}</span><input required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><span>{messages.agents.objective}</span><textarea required minLength={10} value={objective} onChange={(event) => setObjective(event.target.value)} /></label><label><span>{messages.agents.executor}</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="codex-local">{messages.agents.codexLocal}</option><option value="manual">{messages.agents.manual}</option></select></label>{feedback && <p className="form-feedback" role="status">{feedback}</p>}<button className="button button--gold">{messages.agents.addQueue}</button></form></aside>
    </div><AgentInspector agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
  </div>;
}
