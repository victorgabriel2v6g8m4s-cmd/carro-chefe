import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDate, statusLabels } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { AgentFlowMap } from "../components/AgentFlowMap";
import { AgentInspector } from "../components/AgentInspector";
import { RichReferences } from "../components/RichReferences";
import { RunOutcomeReport } from "../components/RunOutcomeReport";
import { StatusBadge } from "../components/StatusBadge";

export function TaskDetail() {
  const { taskId = "" } = useParams();
  const { data, refresh } = useData();
  const [task, setTask] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [justification, setJustification] = useState("");
  const [evidence, setEvidence] = useState("");
  const [feedback, setFeedback] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const load = () => api<any>(`/api/v1/tasks/${taskId}`).then((value) => { setTask(value); setStatus(value.status); });
  useEffect(() => { void load(); }, [taskId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setFeedback("");
    try {
      await api(`/api/v1/tasks/${taskId}/status-transitions`, json("POST", { toStatus: status, justification, actor: "PROPRIETARIO", expectedVersion: task.version, evidence: evidence.split("\n").map((item) => item.trim()).filter(Boolean) }));
      setJustification(""); setEvidence(""); setFeedback("Status atualizado e preservado no histórico."); await Promise.all([load(), refresh()]);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) return;
    setUploadFeedback("Enviando evidência…");
    try {
      const form = new FormData(); form.append("taskId", taskId); form.append("actor", "PROPRIETARIO"); form.append("file", file);
      const result = await api<any>("/api/v1/uploads", { method: "POST", body: form });
      setEvidence((current) => [current, `/api/v1/uploads/${result.id}/content`].filter(Boolean).join("\n")); setFile(null);
      setUploadFeedback("Arquivo salvo e ligado às evidências da próxima mudança."); await load();
    } catch (cause) { setUploadFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (!task) return <section className="panel loading">Abrindo tarefa…</section>;
  const latestRun = task.runs?.[0];
  const runAgents = data?.project?.agents ?? (latestRun?.agent ? [latestRun.agent] : task.owner ? [task.owner] : []);
  return <div className="page-stack"><div className="breadcrumbs"><Link to="/gestao/tarefas">Tarefas</Link><span>/</span><span>{task.id}</span></div>
    <section className="task-hero"><div><span className="eyebrow">{task.pillar?.name} · {task.milestone?.name}</span><h2>{task.title}</h2><div className="task-meta"><StatusBadge status={task.status} /><span>Responsável: {task.owner?.name}</span><span>Versão {task.version}</span></div></div><Link className="button" to={`/gestao/agentes?taskId=${task.id}#delegar`}>Delegar a um agente</Link></section>
    {latestRun?.report && <div className="task-pinned-result"><div className="pinned-label"><span>◆ Relatório fixado da execução mais recente</span><Link to={`/gestao/agentes/execucoes/${latestRun.id}`}>Abrir registro completo →</Link></div><RunOutcomeReport report={latestRun.report} /></div>}
    {latestRun && <section className="task-run-context"><div className="section-title"><div><span className="eyebrow">Execução preservada</span><h3>Fluxo mais recente da tarefa</h3></div><Link className="button button--quiet" to={`/gestao/navegador?runId=${latestRun.id}`}>Abrir navegador da execução</Link></div><AgentFlowMap agents={runAgents} communications={latestRun.communications ?? []} compact onAgentClick={setSelectedAgent} /></section>}
    <section className="reason-banner"><div><small>Por que está em “{statusLabels[task.status] ?? task.status}”?</small><strong>{task.statusJustification || "Status importado do planejamento inicial; justificativa ainda não registrada."}</strong><span>{task.statusChangedBy ? `${task.statusChangedBy} · ${formatDate(task.statusChangedAt)}` : "A próxima mudança criará o histórico auditável."}</span></div></section>
    <div className="content-grid task-detail-grid"><div className="page-stack"><section className="panel"><span className="eyebrow">Definição de pronto</span><h3>Critério de aceite</h3><p>{task.acceptance}</p>{task.dependencies?.length > 0 && <><h4>Dependências</h4><div className="task-chips">{task.dependencies.map((dependency: any) => <Link to={`/gestao/tarefas/${dependency.id}`} key={dependency.id}><StatusBadge status={dependency.status} /> {dependency.title}</Link>)}</div></>}</section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Registro imutável</span><h3>Histórico de status</h3></div></div>{task.transitions.length ? <ol className="timeline">{task.transitions.map((transition: any) => <li key={transition.id}><i /><div><div><StatusBadge status={transition.toStatus} /><time>{formatDate(transition.createdAt)}</time></div><strong><RichReferences text={transition.justification} /></strong><small>{transition.actor} · de {statusLabels[transition.fromStatus] ?? transition.fromStatus}</small>{JSON.parse(transition.evidenceJson ?? "[]").map((item: string) => <RichReferences key={item} text={item} />)}</div></li>)}</ol> : <p className="muted">Nenhuma transição registrada ainda.</p>}</section>
      {task.runs?.length > 0 && <section className="panel"><div className="section-title"><div><span className="eyebrow">Execuções vinculadas</span><h3>Histórico dos agentes</h3></div><span className="count-chip">{task.runs.length}</span></div><div className="item-list">{task.runs.map((run: any) => <Link className="item-row" key={run.id} to={`/gestao/agentes/execucoes/${run.id}`}><span><strong>{run.title}</strong><small>{run.agent?.name} · {formatDate(run.createdAt)}</small></span><StatusBadge status={run.report?.outcome || run.status} /></Link>)}</div></section>}
    </div>
      <aside className="page-stack sticky-column"><section className="panel"><span className="eyebrow">Evidências</span><h3>Arquivos da tarefa</h3>{task.uploads?.length ? <div className="upload-list">{task.uploads.map((item: any) => <Link key={item.id} to={`/gestao/visualizador?uploadId=${encodeURIComponent(item.id)}`}><strong>{item.originalName}</strong><small>{Math.ceil(item.sizeBytes / 1024)} KB · {item.actor}</small></Link>)}</div> : <p className="muted">Nenhum arquivo anexado.</p>}<form className="form-stack" onSubmit={upload}><label><span>Enviar arquivo (até 10 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv,application/json,.docx,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{uploadFeedback && <p className="form-feedback" role="status">{uploadFeedback}</p>}<button className="button" disabled={!file}>Anexar evidência</button></form></section>
        <section className="panel"><span className="eyebrow">Mudança controlada</span><h3>Atualizar status</h3><p className="muted">A justificativa ficará visível na tarefa e não poderá ser apagada.</p><form className="form-stack" onSubmit={submit}><label><span>Novo status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="backlog">Backlog</option><option value="ready">Pronta</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="done">Concluída</option><option value="cancelled">Cancelada</option></select></label><label><span>Justificativa obrigatória</span><textarea minLength={8} required value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="O que mudou, por que mudou e qual é o próximo passo?" /></label><label><span>Evidências (uma por linha)</span><textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Link, arquivo ou referência" /></label>{feedback && <p className="form-feedback" role="status">{feedback}</p>}<button className="button button--gold" disabled={status === task.status}>Registrar mudança</button></form></section>
      </aside>
    </div>
    <AgentInspector agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
  </div>;
}
