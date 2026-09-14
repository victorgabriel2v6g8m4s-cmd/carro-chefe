import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { useData } from "../app/data";
import { AgentLiveConsole } from "../components/AgentLiveConsole";
import { StatusBadge } from "../components/StatusBadge";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { RunOutcomeReport } from "../components/RunOutcomeReport";
import { AgentInspector } from "../components/AgentInspector";
import { QuestionResponseForm } from "../components/QuestionResponseForm";
import { AnswerContext } from "../components/AnswerContext";
import { ExecutionShortcuts } from "../components/ExecutionShortcuts";
import { messages } from "../i18n";
import type { AgentRun, UsageSummary } from "../types";

type UsageTotals = { totalTokens: number; durationMs: number };

export function AgentRunDetail() {
  const { runId = "" } = useParams();
  const { data, refresh } = useData();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const load = () => Promise.all([api<AgentRun>(`/api/v1/agent-runs/${runId}`).then(setRun), api<UsageSummary>("/api/v1/usage/summary").then(setUsageSummary)]);
  useEffect(() => {
    void load();
    const events = new EventSource("/api/v1/events");
    const update = () => void load();
    ["agent.run.updated", "agent.step.updated", "agent.question.asked", "agent.answer.submitted", "agent.usage.updated", "agent.message.created", "agent.log.created", "agent.report.updated", "agent.communication.created"].forEach((name) => events.addEventListener(name, update));
    return () => events.close();
  }, [runId]);
  const totals = useMemo(() => (run?.usage ?? []).reduce<UsageTotals>((sum, item) => ({ totalTokens: sum.totalTokens + (item.totalTokens ?? 0), durationMs: sum.durationMs + (item.durationMs ?? 0) }), { totalTokens: 0, durationMs: 0 }), [run]);
  if (!run) return <section className="panel loading">{messages.common.states.loading}</section>;
  const pending = run.questions.filter((question) => question.status === "pending");
  const ownerUploads = (run.uploads ?? []).filter((upload) => ["proprietario", "PROPRIETARIO", "owner"].includes(upload.actor));
  const agentUploads = (run.uploads ?? []).filter((upload) => !["proprietario", "PROPRIETARIO", "owner"].includes(upload.actor));
  return <div className="page-stack">
    <div className="breadcrumbs"><Link to="/gestao/agentes">Agentes</Link><span>/</span><span>{run.id}</span></div>
    <section className="task-hero run-hero"><div><span className="eyebrow">{run.agent?.name} · {run.provider}</span><h2>{run.title}</h2><div className="task-meta"><StatusBadge status={run.status} />{run.taskId ? <span>Tarefa <Link to={`/gestao/tarefas/${run.taskId}`}>{run.taskId}</Link></span> : <span>{messages.executions.managementConversation}</span>}<span>{messages.executions.updated} {formatDate(run.updatedAt)}</span></div></div></section>
    <section className="objective"><small>{messages.executions.objective}</small><strong>{run.objective}</strong>{run.currentStep && <span>{messages.executions.currentStep}: {run.currentStep}</span>}</section>
    {run.report && <div className={`final-output final-output--${run.agentId === "AG-GESTAO" ? "management" : "agent"}`}><span className="final-output-label">{messages.executions.final} · {run.agent?.name}</span><RunOutcomeReport report={run.report} /></div>}
    <ExecutionShortcuts shortcuts={run.shortcuts ?? []} />
    {pending.map((question) => <section className="panel question-card question-card--pending" key={question.id}><span className="eyebrow">{messages.executions.agentNeedsYou}</span><h3>{question.question}</h3><p>{question.context}</p>{question.recommendation && <div className="recommendation"><small>{messages.executions.recommendation}</small><strong>{question.recommendation}</strong></div>}<QuestionResponseForm questionId={question.id} taskId={question.taskId ?? undefined} suggestions={question.options ?? []} onAnswered={async () => { await Promise.all([load(), refresh()]); }} /></section>)}
    {run.questions.some((question) => question.status !== "pending" && (question.uploads?.length || question.answerReferences?.length)) && <section className="panel"><span className="eyebrow">{messages.executions.ownerContext}</span>{run.questions.filter((question) => question.status !== "pending").map((question) => <details key={question.id} className="answered-context"><summary>{question.question}</summary><p>{question.answer}</p><AnswerContext question={question} /></details>)}</section>}
    {(run.intent?.uploads ?? []).length > 0 && <section className="run-attachments"><span>{messages.executions.deliveredAttachments}</span>{(run.intent?.uploads ?? []).map((upload) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB</small></Link>)}</section>}
    {ownerUploads.length > 0 && <section className="run-attachments"><span>{messages.executions.ownerAttachments}</span>{ownerUploads.map((upload) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB</small></Link>)}</section>}
    {agentUploads.length > 0 && <section className="run-attachments"><span>{messages.executions.artifacts}</span>{agentUploads.map((upload) => <Link key={upload.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB · {upload.actor}</small></Link>)}</section>}
    <AgentFlowMap agents={data?.project?.agents ?? (run.agent ? [run.agent] : [])} communications={run.communications ?? []} compact onAgentClick={setSelectedAgent} />
    <AgentLiveConsole logs={run.logs ?? []} live={["queued", "running", "waiting_input"].includes(run.status)} />
    <div className="run-layout">
      <section className="panel"><div className="section-title"><div><span className="eyebrow">{messages.executions.procedure}</span><h3>{messages.executions.steps}</h3></div><span className="count-chip">{run.journey?.length ?? run.steps.length}</span></div>{(run.journey?.length || run.steps.length) ? <ol className="stepper">{(run.journey?.length ? run.journey : run.steps).map((step) => <li key={step.id} className={`step-${step.status}`}><div className="step-number">{step.order}</div><div><div><strong>{step.title}</strong><StatusBadge status={step.status} /></div>{step.description && <p>{step.description}</p>}{step.procedure && <details><summary>{messages.executions.registeredProcedure}</summary><pre>{step.procedure}</pre></details>}{(step.result || step.detail) && <div className="step-result"><small>{messages.executions.result}</small>{step.result || step.detail}</div>}</div></li>)}</ol> : <p className="muted">{messages.executions.waitingProcedure}</p>}</section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">{messages.executions.trace}</span><h3>{messages.executions.updates}</h3></div></div>{run.messages.length ? <div className="conversation">{run.messages.map((message) => <article key={message.id} className={`message message-${message.kind}`}><div><strong>{message.sender}</strong><time>{formatDate(message.createdAt)}</time></div><p>{message.content}</p></article>)}</div> : <p className="muted">{messages.common.states.noUpdates}</p>}</section>
      <aside className="panel usage-panel"><span className="eyebrow">{messages.executions.consumption}</span><h3>{totals.totalTokens ? totals.totalTokens.toLocaleString("pt-BR") : messages.common.states.unavailable}</h3><p>{totals.totalTokens ? messages.executions.runtimeTokens : messages.executions.usagePending}</p><dl><div><dt>{messages.executions.reportedDuration}</dt><dd>{totals.durationMs ? `${Math.round(totals.durationMs / 1000)} s` : "—"}</dd></div><div><dt>{messages.executions.records}</dt><dd>{run.usage.length}</dd></div><div><dt>{messages.executions.planQuota}</dt><dd>{usageSummary?.planQuota ?? "Não fornecida"}</dd></div><div><dt>{messages.executions.source}</dt><dd>{usageSummary?.source === "runtime" ? messages.executions.runtimeSource : messages.common.states.unavailable}</dd></div></dl><small>{messages.executions.quotaNote}</small></aside>
    </div><AgentInspector agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
  </div>;
}
