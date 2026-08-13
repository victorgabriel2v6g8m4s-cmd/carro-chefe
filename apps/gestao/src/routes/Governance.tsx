import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "../app/data";
import { api, json } from "../api/client";
import { AttachmentPicker } from "../components/AttachmentPicker";
import { RichReferences } from "../components/RichReferences";
import { StatusBadge } from "../components/StatusBadge";

export function Governance() {
  const { data, loading, refresh } = useData();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState("");
  if (loading || !data) return <section className="panel loading">Carregando governança…</section>;
  const q = (params.get("q") ?? "").toLocaleLowerCase("pt-BR");
  const searchable = (value: unknown) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(q);
  const decisions = data.decisions.filter((item) => !q || searchable(`${item.id} ${item.question} ${item.recommendation} ${item.resolution} ${item.contexts?.map((entry: any) => entry.content).join(" ")}`));
  const risks = [...data.risks].filter((item) => !q || searchable(`${item.id} ${item.title} ${item.mitigation} ${item.trigger}`)).sort((a, b) => b.probability * b.impact - a.probability * a.impact);
  const updateSearch = (value: string) => { const next = new URLSearchParams(params); value ? next.set("q", value) : next.delete("q"); setParams(next, { replace: true }); };

  async function addContext(event: FormEvent, decisionId: string) {
    event.preventDefault(); setFeedback("Salvando contexto e anexos…");
    try {
      for (const file of files) { const form = new FormData(); form.append("decisionId", decisionId); form.append("actor", "PROPRIETARIO"); form.append("file", file); await api("/api/v1/uploads", { method: "POST", body: form }); }
      await api(`/api/v1/decisions/${decisionId}/context`, json("POST", { actor: "PROPRIETARIO", content: content.trim() || `Anexos adicionados: ${files.map((file) => file.name).join(", ")}`, sourceUrl: sourceUrl.trim() || null }));
      setContent(""); setSourceUrl(""); setFiles([]); setEditing(null); setFeedback("Informações preservadas no registro da decisão."); await refresh();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }

  return <div className="page-stack"><section className="intro"><span className="eyebrow">Decidir antes de executar</span><h2>Decisões e riscos</h2><p>Informações, fontes e anexos permanecem ligados à decisão para acelerar a análise sem transformar dúvidas em premissas silenciosas.</p></section>
    <section className="panel search-panel"><label><span>Buscar decisões e riscos</span><input type="search" value={params.get("q") ?? ""} onChange={(event) => updateSearch(event.target.value)} placeholder="Código, pergunta, risco, recomendação ou contexto" /></label><small>{decisions.length} decisão(ões) · {risks.length} risco(s)</small></section>
    {feedback && <p className="form-feedback global-feedback" role="status">{feedback}</p>}
    <div className="content-grid"><section className="panel"><div className="section-title"><div><span className="eyebrow">Registro persistente</span><h3>Registro de decisões</h3></div></div><div className="governance-list">{decisions.map((decision) => <article key={decision.id} id={`decision-${decision.id}`}><div><small>{decision.id}</small><StatusBadge status={decision.status} /></div><h4>{decision.question}</h4>{decision.recommendation && <p><b>Recomendação:</b> <RichReferences text={decision.recommendation} /></p>}{decision.resolution && <p><b>Decisão:</b> <RichReferences text={decision.resolution} /></p>}
          {decision.contexts?.length > 0 && <details><summary>{decision.contexts.length} informação(ões) de apoio</summary><div className="decision-context-list">{decision.contexts.map((entry: any) => <div key={entry.id}><RichReferences text={entry.content} />{entry.sourceUrl && <RichReferences text={`\n${entry.sourceUrl}`} />}<small>{entry.actor} · {new Date(entry.createdAt).toLocaleString("pt-BR")}</small></div>)}</div></details>}
          {decision.uploads?.length > 0 && <div className="decision-files">{decision.uploads.map((file: any) => <a key={file.id} href={`/gestao/visualizador?uploadId=${encodeURIComponent(file.id)}`}><span>{file.originalName}</span><small>{Math.ceil(file.sizeBytes / 1024)} KB</small></a>)}</div>}
          <button className="button button--quiet" onClick={() => { setEditing(editing === decision.id ? null : decision.id); setFeedback(""); }}>＋ Adicionar informação ou mídia</button>
          {editing === decision.id && <form className="form-stack decision-context-form" onSubmit={(event) => void addContext(event, decision.id)}><label><span>Informação que ajuda a decidir</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Contexto, hipótese, restrição, parecer ou dado verificado" /></label><label><span>Fonte na web (opcional)</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label><AttachmentPicker files={files} onChange={setFiles} /><button className="button button--gold" disabled={!content.trim() && files.length === 0}>Preservar no registro</button></form>}
        </article>)}{!decisions.length && <p className="muted">Nenhuma decisão corresponde à busca.</p>}</div></section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Probabilidade × impacto</span><h3>Mapa de riscos</h3></div></div><div className="risk-list">{risks.map((risk) => <article key={risk.id}><span className="score">{risk.probability * risk.impact}</span><div><h4>{risk.title}</h4><p><RichReferences text={risk.mitigation} /></p><small>Probabilidade {risk.probability} · Impacto {risk.impact}</small></div></article>)}{!risks.length && <p className="muted">Nenhum risco corresponde à busca.</p>}</div></section>
    </div>
  </div>;
}
