import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { AgentLiveConsole } from "../components/AgentLiveConsole";
import { StatusBadge } from "../components/StatusBadge";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { RunOutcomeReport } from "../components/RunOutcomeReport";
import { AgentInspector } from "../components/AgentInspector";

export function AgentRunDetail() {
  const { runId = "" } = useParams();
  const { data, refresh } = useData();
  const [run, setRun] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const load = () => Promise.all([api<any>(`/api/v1/agent-runs/${runId}`).then(setRun), api<any>("/api/v1/usage/summary").then(setUsageSummary)]);
  useEffect(() => {
    void load();
    const events = new EventSource("/api/v1/events");
    const update = () => void load();
    ["agent.run.updated", "agent.step.updated", "agent.question.asked", "agent.answer.submitted", "agent.usage.updated", "agent.message.created", "agent.log.created", "agent.report.updated", "agent.communication.created"].forEach((name) => events.addEventListener(name, update));
    return () => events.close();
  }, [runId]);
  const totals = useMemo(() => (run?.usage ?? []).reduce((sum: any, item: any) => ({ totalTokens: sum.totalTokens + (item.totalTokens ?? 0), durationMs: sum.durationMs + (item.durationMs ?? 0) }), { totalTokens: 0, durationMs: 0 }), [run]);
  async function answer(event: FormEvent, id: string) { event.preventDefault(); await api(`/api/v1/agent-questions/${id}/answer`, json("POST", { answer: answers[id], answeredBy: "proprietario" })); await Promise.all([load(), refresh()]); }
  if (!run) return <section className="panel loading">Abrindo execução…</section>;
  const pending = run.questions.filter((question: any) => question.status === "pending");
  return <div className="page-stack">
    <div className="breadcrumbs"><Link to="/gestao/agentes">Agentes</Link><span>/</span><span>{run.id}</span></div>
    <section className="task-hero run-hero"><div><span className="eyebrow">{run.agent?.name} · {run.provider}</span><h2>{run.title}</h2><div className="task-meta"><StatusBadge status={run.status} /><span>Tarefa <Link to={`/gestao/tarefas/${run.taskId}`}>{run.taskId}</Link></span><span>Atualizado {formatDate(run.updatedAt)}</span></div></div></section>
    <section className="objective"><small>Objetivo da execução</small><strong>{run.objective}</strong>{run.currentStep && <span>Passo atual: {run.currentStep}</span>}</section>
    {pending.map((question: any) => <section className="panel question-card question-card--pending" key={question.id}><span className="eyebrow">O agente precisa de você para continuar</span><h3>{question.question}</h3><p>{question.context}</p>{question.recommendation && <div className="recommendation"><small>Recomendação</small><strong>{question.recommendation}</strong></div>}<form className="answer-form" onSubmit={(event) => answer(event, question.id)}><label><span>Sua resposta</span><textarea required value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /></label><button className="button button--gold">Responder e devolver à fila</button></form></section>)}
    {run.intent?.uploads?.length > 0 && <section className="run-attachments"><span>Anexos entregues ao agente</span>{run.intent.uploads.map((upload: any) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB</small></Link>)}</section>}
    {run.uploads?.length > 0 && <section className="run-attachments"><span>Artefatos produzidos</span>{run.uploads.map((upload: any) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB · {upload.actor}</small></Link>)}</section>}
    <RunOutcomeReport report={run.report} />
    <AgentFlowMap agents={data?.project?.agents ?? [run.agent]} communications={run.communications ?? []} compact onAgentClick={setSelectedAgent} />
    <AgentLiveConsole logs={run.logs ?? []} live={["queued", "running", "waiting_input"].includes(run.status)} />
    <div className="run-layout">
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Procedimento</span><h3>Passo a passo</h3></div><span className="count-chip">{run.journey?.length ?? run.steps.length}</span></div>{(run.journey?.length || run.steps.length) ? <ol className="stepper">{(run.journey?.length ? run.journey : run.steps).map((step: any) => <li key={step.id} className={`step-${step.status}`}><div className="step-number">{step.order}</div><div><div><strong>{step.title}</strong><StatusBadge status={step.status} /></div>{step.description && <p>{step.description}</p>}{step.procedure && <details><summary>Procedimento registrado</summary><pre>{step.procedure}</pre></details>}{(step.result || step.detail) && <div className="step-result"><small>Resultado</small>{step.result || step.detail}</div>}</div></li>)}</ol> : <p className="muted">O passo a passo aparecerá quando o executor iniciar.</p>}</section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Rastro completo</span><h3>Conversa e atualizações</h3></div></div>{run.messages.length ? <div className="conversation">{run.messages.map((message: any) => <article key={message.id} className={`message message-${message.kind}`}><div><strong>{message.sender}</strong><time>{formatDate(message.createdAt)}</time></div><p>{message.content}</p></article>)}</div> : <p className="muted">Sem atualizações.</p>}</section>
      <aside className="panel usage-panel"><span className="eyebrow">Consumo da execução</span><h3>{totals.totalTokens ? totals.totalTokens.toLocaleString("pt-BR") : "Indisponível"}</h3><p>{totals.totalTokens ? "tokens reportados pelo runtime" : "O executor ainda não reportou uso."}</p><dl><div><dt>Duração reportada</dt><dd>{totals.durationMs ? `${Math.round(totals.durationMs / 1000)} s` : "—"}</dd></div><div><dt>Registros</dt><dd>{run.usage.length}</dd></div><div><dt>Cota do plano</dt><dd>{usageSummary?.planQuota ?? "Não fornecida"}</dd></div><div><dt>Fonte</dt><dd>{usageSummary?.source === "runtime" ? "Runtime do Codex" : "Indisponível"}</dd></div></dl><small>Não estimamos porcentagens quando o provedor não informa o limite do plano.</small></aside>
    </div><AgentInspector agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
  </div>;
}
