import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { RunOutcomeReport } from "../components/RunOutcomeReport";

export function CommandDetail() {
  const { intentId = "" } = useParams();
  const [intent, setIntent] = useState<any>(null);
  const load = () => api<any>(`/api/v1/intents/${intentId}`).then(setIntent);
  useEffect(() => {
    void load();
    const stream = new EventSource("/api/v1/events");
    const update = () => void load();
    ["intent.started", "intent.completed", "intent.failed", "agent.run.updated", "agent.step.updated", "agent.message.created", "agent.question.asked", "agent.log.created", "agent.report.updated", "agent.communication.created"].forEach((name) => stream.addEventListener(name, update));
    return () => stream.close();
  }, [intentId]);
  if (!intent) return <section className="panel loading">Abrindo comando…</section>;
  return <div className="page-stack">
    <div className="breadcrumbs"><Link to="/gestao/comandos">Comandos</Link><span>/</span><span>{intent.id}</span></div>
    <section className="task-hero command-hero"><div><span className="eyebrow">{intent.subject}</span><h2>{intent.summary}</h2><div className="task-meta"><StatusBadge status={intent.status} /><span>Criado {formatDate(intent.createdAt)}</span><span>{intent.runs.length} agente{intent.runs.length === 1 ? "" : "s"} acionado{intent.runs.length === 1 ? "" : "s"}</span></div></div></section>
    <blockquote className="owner-command"><small>Orientação original</small><p>“{intent.prompt}”</p></blockquote>
    {intent.uploads?.length > 0 && <section className="run-attachments"><span>Anexos do comando</span>{intent.uploads.map((upload: any) => <a key={upload.id} href={`/api/v1/uploads/${upload.id}/content`}><strong>{upload.originalName}</strong><small>{Math.ceil(upload.sizeBytes / 1024)} KB</small></a>)}</section>}
    {intent.facts.length > 0 && <section className="fact-strip">{intent.facts.map((fact: any) => <div key={fact.id}><small>Informação registrada</small><strong>{fact.key === "erp.selected" ? "ERP selecionado" : fact.key}: {fact.value}</strong><span>{fact.verificationStatus === "pending_verification" ? "Verificação em andamento" : fact.verificationStatus === "reviewed" ? "Verificação concluída; revisar evidências" : "Verificação encontrou falha"}</span></div>)}</section>}
    <AgentFlowMap agents={intent.runs.map((run: any) => run.agent)} communications={intent.communications ?? []} />
    <section className="dispatch-grid">{intent.runs.map((run: any) => <article className="panel dispatch-card" key={run.id}><div><div><small>{run.agent.name}</small><h3>{run.task.title}</h3></div><StatusBadge status={run.status} /></div><p>{run.currentStep || "Na fila para o supervisor iniciar."}</p>{run.steps.length > 0 && <ol>{run.steps.map((step: any) => <li key={step.id}><StatusBadge status={step.status} /><span>{step.title}</span></li>)}</ol>}{run.messages.length > 0 && <div className="latest-result"><small>Última atualização</small><p>{run.messages[run.messages.length - 1].content}</p></div>}<Link className="button" to={`/gestao/agentes/execucoes/${run.id}`}>Ver execução completa</Link></article>)}</section>
    {intent.runs.map((run: any) => run.report && <div key={`report-${run.id}`} className="command-run-report"><span className="eyebrow">{run.agent.name} · {run.task.id}</span><RunOutcomeReport report={run.report} /></div>)}
    {intent.notification && <section className="completion-card"><span>{intent.status === "completed" ? "✓" : "!"}</span><div><small>{intent.notification.title}</small><strong>{intent.notification.message}</strong><p>Concluído em {formatDate(intent.completedAt)}. Abra as execuções acima para revisar procedimento, fontes e consumo.</p></div></section>}
  </div>;
}
