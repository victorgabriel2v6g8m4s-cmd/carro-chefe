import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "@carro-chefe/ui";
import { api } from "../api/client";
import { RichReferences } from "../components/RichReferences";

const labels: Record<string, string> = { task_added: "Tarefa adicionada", task_resolved: "Tarefa resolvida", task_cancelled: "Tarefa eliminada", task_status_changed: "Status da tarefa alterado", decision_added: "Decisão adicionada", decision_resolved: "Decisão resolvida", decision_cancelled: "Decisão eliminada", decision_context_added: "Informação adicionada", agent_run_created: "Execução criada" };

export function Registry() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<any>({ items: [], page: 1, pageCount: 1, total: 0 });
  const q = params.get("q") ?? "", page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  useEffect(() => { const timer = setTimeout(() => void api<any>(`/api/v1/audit?page=${page}&pageSize=25${q ? `&q=${encodeURIComponent(q)}` : ""}`).then(setResult), 180); return () => clearTimeout(timer); }, [page, q]);
  const update = (next: { q?: string; page?: number }) => { const search = new URLSearchParams(params); if (next.q !== undefined) { next.q ? search.set("q", next.q) : search.delete("q"); search.set("page", "1"); } if (next.page !== undefined) search.set("page", String(next.page)); setParams(search, { replace: true }); };
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Auditoria append-only</span><h2>Registro de mudanças</h2><p>A consulta é paginada no banco para preservar desempenho conforme o histórico crescer.</p></section>
    <section className="panel search-panel"><label><span>Buscar no registro</span><input type="search" value={q} onChange={(event) => update({ q: event.target.value })} placeholder="Ação, tarefa, decisão, agente ou justificativa" /></label><small>{result.total} evento(s)</small></section>
    <section className="panel audit-register">{result.items.map((item: any) => <article key={item.id}><div><span className={`audit-kind audit-kind--${item.entityType}`}>{labels[item.action] || item.action}</span><time>{formatDate(item.createdAt)}</time></div><h3>{item.entityId}</h3><p><RichReferences text={item.summary} /></p><footer><span>{item.actor}</span>{item.taskId && <Link to={`/gestao/tarefas/${item.taskId}`}>Abrir tarefa →</Link>}{item.decisionId && <Link to={`/gestao/governanca#decision-${item.decisionId}`}>Abrir decisão →</Link>}</footer></article>)}</section>
    <nav className="pagination" aria-label="Paginação do registro"><button disabled={page <= 1} onClick={() => update({ page: page - 1 })}>← Anterior</button><span>Página {page} de {result.pageCount}</span><button disabled={page >= result.pageCount} onClick={() => update({ page: page + 1 })}>Próxima →</button></nav>
  </div>;
}
