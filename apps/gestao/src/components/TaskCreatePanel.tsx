import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, json } from "../api/client";
import { useData } from "../app/data";

function taskIdFor(agentId: string) {
  const area = agentId.replace("AG-", "").slice(0, 3) || "GES";
  return `TASK-${area}-${Date.now().toString().slice(-6)}`.toLocaleUpperCase("pt-BR");
}

export function TaskCreatePanel() {
  const { data, refresh } = useData();
  const [params, setParams] = useSearchParams();
  const sourceRunId = params.get("createFromRun");
  const panel = useRef<HTMLElement>(null);
  const [form, setForm] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceRunId || !data) return;
    api<any>(`/api/v1/agent-runs/${sourceRunId}`).then((run) => {
      const recommendation = run.report?.recommendations?.[0] ?? run.report?.summary ?? run.title;
      const ownerAgentId = run.task?.ownerAgentId ?? "AG-GESTAO";
      setForm({ id: taskIdFor(ownerAgentId), pillarId: run.task?.pillarId ?? data.project.pillars[0]?.id ?? "", milestoneId: run.task?.milestoneId ?? data.project.milestones[0]?.id ?? "",
        ownerAgentId, title: recommendation.slice(0, 220), impact: 3, urgency: 3, status: "backlog",
        acceptance: `Entregar e registrar evidências para: ${recommendation}`.slice(0, 3900), dependencyIds: run.taskId ? [run.taskId] : [], actor: "PROPRIETARIO" });
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
    }).catch((cause) => setFeedback(cause instanceof Error ? cause.message : String(cause)));
  }, [sourceRunId, data]);

  if (!sourceRunId) return null;
  const close = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("createFromRun"); return next; }, { replace: true });
  async function submit(event: FormEvent) {
    event.preventDefault(); setFeedback("");
    try { const task = await api<any>("/api/v1/tasks", json("POST", form)); setCreatedId(task.id); setFeedback("Tarefa criada e registrada no roteiro."); await refresh(); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  return <section ref={panel} className="panel quick-create-panel"><div className="section-title"><div><span className="eyebrow">Atalho da execução</span><h3>Criar tarefa rastreável</h3></div><button type="button" className="icon-button" aria-label="Fechar criação de tarefa" onClick={close}>×</button></div>
    {!form ? <p className="muted">Preparando os dados da execução…</p> : <form className="form-stack" onSubmit={submit}><div className="form-two"><label><span>ID estável</span><input required pattern="TASK-[A-Z0-9-]+" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value.toLocaleUpperCase("pt-BR") })} /></label><label><span>Responsável</span><select value={form.ownerAgentId} onChange={(event) => setForm({ ...form, ownerAgentId: event.target.value })}>{data?.project.agents.map((agent: any) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label></div>
      <label><span>Título</span><input required minLength={5} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label><span>Critério de aceite</span><textarea required minLength={8} value={form.acceptance} onChange={(event) => setForm({ ...form, acceptance: event.target.value })} /></label>
      <div className="form-two"><label><span>Pilar</span><select value={form.pillarId} onChange={(event) => setForm({ ...form, pillarId: event.target.value })}>{data?.project.pillars.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Marco</span><select value={form.milestoneId} onChange={(event) => setForm({ ...form, milestoneId: event.target.value })}>{data?.project.milestones.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="form-two"><label><span>Impacto · {form.impact}</span><input type="range" min="1" max="5" value={form.impact} onChange={(event) => setForm({ ...form, impact: Number(event.target.value) })} /></label><label><span>Urgência · {form.urgency}</span><input type="range" min="1" max="5" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: Number(event.target.value) })} /></label></div>
      {feedback && <p className="form-feedback" role="status">{feedback}{createdId && <> <Link to={`/gestao/tarefas/${createdId}`}>Abrir tarefa</Link></>}</p>}<button className="button button--gold" disabled={!!createdId}>{createdId ? "Tarefa criada" : "Criar tarefa"}</button></form>}
  </section>;
}
