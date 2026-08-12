import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDate, statusLabels } from "@carro-chefe/ui";
import { api, json } from "../api/client";
import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function TaskDetail() {
  const { taskId = "" } = useParams();
  const { refresh } = useData();
  const [task, setTask] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [justification, setJustification] = useState("");
  const [evidence, setEvidence] = useState("");
  const [feedback, setFeedback] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState("");
  const load = () => api<any>(`/api/v1/tasks/${taskId}`).then((value) => { setTask(value); setStatus(value.status); });
  useEffect(() => { void load(); }, [taskId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setFeedback("");
    try {
      await api(`/api/v1/tasks/${taskId}/status-transitions`, json("POST", { toStatus: status, justification, actor: "proprietario", expectedVersion: task.version, evidence: evidence.split("\n").map((item) => item.trim()).filter(Boolean) }));
      setJustification(""); setEvidence(""); setFeedback("Status atualizado e registrado no histórico."); await Promise.all([load(), refresh()]);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) return;
    setUploadFeedback("Enviando evidência…");
    try { const form = new FormData(); form.append("taskId", taskId); form.append("actor", "proprietario"); form.append("file", file); const result = await api<any>("/api/v1/uploads", { method: "POST", body: form }); const link = `/api/v1/uploads/${result.id}/content`; setEvidence((current) => [current, link].filter(Boolean).join("\n")); setFile(null); setUploadFeedback("Arquivo salvo e adicionado às evidências da próxima mudança."); await load(); }
    catch (cause) { setUploadFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  if (!task) return <section className="panel loading">Abrindo tarefa…</section>;
  return <div className="page-stack"><div className="breadcrumbs"><Link to="/gestao/tarefas">Tarefas</Link><span>/</span><span>{task.id}</span></div>
    <section className="task-hero"><div><span className="eyebrow">{task.pillar?.name} · {task.milestone?.name}</span><h2>{task.title}</h2><div className="task-meta"><StatusBadge status={task.status} /><span>Responsável: {task.owner?.name}</span><span>Versão {task.version}</span></div></div><Link className="button" to={`/gestao/agentes?taskId=${task.id}`}>Delegar a um agente</Link></section>
    <section className="reason-banner"><div><small>Por que está em “{statusLabels[task.status] ?? task.status}”?</small><strong>{task.statusJustification || "Status importado do planejamento inicial; justificativa ainda não registrada."}</strong><span>{task.statusChangedBy ? `${task.statusChangedBy} · ${formatDate(task.statusChangedAt)}` : "A próxima mudança criará o histórico auditável."}</span></div></section>
    <div className="content-grid task-detail-grid"><div className="page-stack"><section className="panel"><span className="eyebrow">Definição de pronto</span><h3>Critério de aceite</h3><p>{task.acceptance}</p>{task.dependencies?.length > 0 && <><h4>Dependências</h4><div className="task-chips">{task.dependencies.map((dependency: any) => <Link to={`/gestao/tarefas/${dependency.id}`} key={dependency.id}><StatusBadge status={dependency.status} /> {dependency.title}</Link>)}</div></>}</section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Registro imutável</span><h3>Histórico de status</h3></div></div>{task.transitions.length ? <ol className="timeline">{task.transitions.map((transition: any) => <li key={transition.id}><i /><div><div><StatusBadge status={transition.toStatus} /><time>{formatDate(transition.createdAt)}</time></div><strong>{transition.justification}</strong><small>{transition.actor} · de {statusLabels[transition.fromStatus] ?? transition.fromStatus}</small>{JSON.parse(transition.evidenceJson ?? "[]").map((item: string) => <a key={item} href={item}>{item}</a>)}</div></li>)}</ol> : <p className="muted">Nenhuma transição registrada ainda.</p>}</section></div>
      <aside className="page-stack sticky-column"><section className="panel"><span className="eyebrow">Evidências</span><h3>Arquivos da tarefa</h3>{task.uploads?.length ? <div className="upload-list">{task.uploads.map((item: any) => <a key={item.id} href={`/api/v1/uploads/${item.id}/content`}><strong>{item.originalName}</strong><small>{Math.ceil(item.sizeBytes / 1024)} KB · {item.actor}</small></a>)}</div> : <p className="muted">Nenhum arquivo anexado.</p>}<form className="form-stack" onSubmit={upload}><label><span>Enviar arquivo (até 10 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv,application/json,.docx,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{uploadFeedback && <p className="form-feedback" role="status">{uploadFeedback}</p>}<button className="button" disabled={!file}>Anexar evidência</button></form></section><section className="panel"><span className="eyebrow">Mudança controlada</span><h3>Atualizar status</h3><p className="muted">A justificativa ficará visível na tarefa e não poderá ser apagada.</p><form className="form-stack" onSubmit={submit}><label><span>Novo status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="backlog">Backlog</option><option value="ready">Pronta</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="done">Concluída</option><option value="cancelled">Cancelada</option></select></label><label><span>Justificativa obrigatória</span><textarea minLength={8} required value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="O que mudou, por que mudou e qual é o próximo passo?" /></label><label><span>Evidências (uma por linha)</span><textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Link, arquivo ou referência" /></label>{feedback && <p className="form-feedback" role="status">{feedback}</p>}<button className="button button--gold" disabled={status === task.status}>Registrar mudança</button></form></section></aside>
    </div>
  </div>;
}
