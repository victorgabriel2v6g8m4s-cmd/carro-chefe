import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { KnowledgeBranch } from "../components/KnowledgeBranch";
import { KnowledgeFilePreview } from "../components/KnowledgeFilePreview";
import { KnowledgeNodeEditor } from "../components/KnowledgeNodeEditor";

type EditorState = { mode: "create" | "edit"; node?: any; parent?: any | null; initial?: any };

function suggestedRoot(roots: any[], text: string) {
  const rules: Array<[RegExp, string]> = [[/endere[cç]o|loja|quiosque|im[oó]vel/iu, "estabelecimento"], [/erp|sistema|integra[cç][aã]o/iu, "sistemas"],
    [/equipe|funcion[aá]ri|atendente|parrilheiro/iu, "pessoas"], [/cozinha|equipamento|fluxo/iu, "operacao"], [/marca|logo|embalagem/iu, "marca"], [/decis[aã]o|definid|recomenda/iu, "decisoes"]];
  const slug = rules.find(([pattern]) => pattern.test(text))?.[1] ?? "decisoes";
  return roots.find((node) => node.slug === slug) ?? null;
}

export function Knowledge() {
  const [params, setParams] = useSearchParams();
  const [childrenByParent, setChildrenByParent] = useState<Map<string, any[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Map<string, any>>(new Map());
  const [selected, setSelected] = useState<any>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const roots = childrenByParent.get("root") ?? [];

  async function loadChildren(parentId: string | null, force = false) {
    const key = parentId ?? "root";
    if (!force && childrenByParent.has(key)) return;
    setLoading((current) => new Set(current).add(key));
    try { const items = await api<any[]>(`/api/v1/knowledge/nodes?parentId=${encodeURIComponent(key)}&limit=100`); setChildrenByParent((current) => new Map(current).set(key, items)); }
    finally { setLoading((current) => { const next = new Set(current); next.delete(key); return next; }); }
  }

  useEffect(() => { void loadChildren(null); }, []);
  useEffect(() => {
    const nodeId = params.get("node"); if (!nodeId) return;
    api<any>(`/api/v1/knowledge/nodes/${nodeId}`).then(setSelected).catch(() => undefined);
  }, [params.get("node")]);
  useEffect(() => {
    const sourceRunId = params.get("createFromRun");
    if (!sourceRunId || !roots.length || editor) return;
    api<any>(`/api/v1/agent-runs/${sourceRunId}`).then((run) => {
      const value = run.report?.summary ?? run.objective;
      setEditor({ mode: "create", parent: suggestedRoot(roots, value), initial: { name: run.title.slice(0, 150), value, kind: "fact", valueType: /endere[cç]o/iu.test(value) ? "address" : /decis[aã]o|recomenda/iu.test(value) ? "decision" : "text",
        verificationStatus: "derived", sourceRunId, references: [{ id: run.id, type: "run", label: run.title, route: `/gestao/agentes/execucoes/${run.id}` }] } });
    }).catch((cause) => setFeedback(cause instanceof Error ? cause.message : String(cause)));
  }, [params.get("createFromRun"), roots.length]);
  useEffect(() => {
    const stream = new EventSource("/api/v1/events");
    const reload = () => { void loadChildren(null, true); for (const id of expanded) void loadChildren(id, true); };
    ["knowledge.node.created", "knowledge.node.updated", "knowledge.node.archived", "knowledge.node.captured"].forEach((event) => stream.addEventListener(event, reload));
    return () => stream.close();
  }, [expanded]);

  async function toggle(node: any) {
    if (expanded.has(node.id)) return setExpanded((current) => { const next = new Set(current); next.delete(node.id); return next; });
    await loadChildren(node.id); setExpanded((current) => new Set(current).add(node.id));
  }
  async function select(node: any) {
    const detail = await api<any>(`/api/v1/knowledge/nodes/${node.id}`); setSelected(detail); setEditor(null);
    setParams((current) => { const next = new URLSearchParams(current); next.set("node", node.id); return next; }, { replace: true });
  }
  function hideNode(node: any) { setHidden((current) => new Map(current).set(node.id, node)); }
  async function search(event: FormEvent) {
    event.preventDefault(); setFeedback("");
    try { setResults(query.trim() ? await api<any[]>(`/api/v1/knowledge/nodes?q=${encodeURIComponent(query)}&limit=40`) : []); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : String(cause)); }
  }
  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button,a,input,textarea,select")) return;
    event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
  }
  function movePan(event: ReactPointerEvent<HTMLDivElement>) { if (drag.current) setPan({ x: drag.current.originX + event.clientX - drag.current.x, y: drag.current.originY + event.clientY - drag.current.y }); }
  const hiddenNodes = useMemo(() => [...hidden.values()], [hidden]);

  return <div className="page-stack knowledge-page"><section className="intro"><span className="eyebrow">Memória operacional seletiva</span><h2>Árvore de informações</h2><p>Cada ramo é carregado somente quando aberto. Os agentes consultam caminhos específicos e recebem apenas o contexto relacionado ao objetivo atual.</p></section>
    <section className="panel knowledge-toolbar"><form onSubmit={search}><label><span>Buscar na memória</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: endereço, ERP, cozinha" /></label><button className="button button--quiet">Buscar</button></form><div className="knowledge-zoom"><button type="button" aria-label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(.5, value - .1))}>−</button><output>{Math.round(zoom * 100)}%</output><button type="button" aria-label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(1.8, value + .1))}>+</button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Centralizar</button></div><button type="button" className="button button--gold" onClick={() => setEditor({ mode: "create", parent: null })}>Novo ramo raiz</button></section>
    {hiddenNodes.length > 0 && <section className="knowledge-hidden"><span>Ocultos nesta visualização</span>{hiddenNodes.map((node) => <button key={node.id} type="button" onClick={() => setHidden((current) => { const next = new Map(current); next.delete(node.id); return next; })}>{node.name} <b>mostrar</b></button>)}</section>}
    {results.length > 0 && <section className="panel knowledge-search-results"><div className="section-title"><div><span className="eyebrow">Busca</span><h3>{results.length} resultado(s)</h3></div><button type="button" className="icon-button" onClick={() => setResults([])} aria-label="Fechar resultados">×</button></div><div>{results.map((node) => <button type="button" key={node.id} onClick={() => void select(node)}><small>{node.path}</small><strong>{node.name}</strong><span>{node.value}</span></button>)}</div></section>}
    {feedback && <p className="form-feedback" role="status">{feedback}</p>}
    <div className={`knowledge-workspace ${editor || selected ? "has-inspector" : ""}`}>
      <section className="knowledge-viewport" aria-label="Árvore interativa de informações" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="knowledge-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><ul className="knowledge-tree-list">{roots.map((node) => <KnowledgeBranch key={node.id} node={node} childrenByParent={childrenByParent} expanded={expanded} loading={loading} hidden={new Set(hidden.keys())} onToggle={(item) => void toggle(item)} onSelect={(item) => void select(item)} onHide={hideNode} />)}</ul>{loading.has("root") && <p className="muted">Carregando raízes…</p>}</div>
      </section>
      {editor ? <KnowledgeNodeEditor node={editor.node} parent={editor.parent} initial={editor.initial} onClose={() => setEditor(null)} onSaved={async (node) => { setEditor(null); setSelected(node); await loadChildren(node.parentId, true); setParams((current) => { const next = new URLSearchParams(current); next.delete("createFromRun"); next.set("node", node.id); return next; }, { replace: true }); }} onDeleted={async (node) => { setEditor(null); setSelected(null); await loadChildren(node.parentId, true); }} />
        : selected && <aside className="knowledge-inspector"><div className="section-title"><div><span className="eyebrow">{selected.path}</span><h3>{selected.name}</h3></div><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button></div>{selected.value && <p className="knowledge-value">{selected.value}</p>}<dl><div><dt>Tipo</dt><dd>{selected.kind === "fact" ? "Informação" : "Ramo"}</dd></div><div><dt>Confiabilidade</dt><dd>{selected.verificationStatus}</dd></div><div><dt>Versão</dt><dd>{selected.version}</dd></div></dl>{selected.attachments?.length > 0 && <div className="knowledge-inspector-files"><span>Arquivos</span>{selected.attachments.map((upload: any) => <KnowledgeFilePreview key={upload.id} upload={upload} />)}</div>}{selected.references?.length > 0 && <div className="knowledge-inspector-references"><span>Referências</span>{selected.references.map((reference: any) => reference.route ? <Link key={`${reference.type}-${reference.id}`} to={reference.route}>@{reference.id} · {reference.label}</Link> : <b key={`${reference.type}-${reference.id}`}>@{reference.id} · {reference.label}</b>)}</div>}<div className="knowledge-inspector-actions"><button type="button" className="button button--gold" onClick={() => setEditor({ mode: "create", parent: selected })}>Criar subramo</button><button type="button" className="button button--quiet" onClick={() => setEditor({ mode: "edit", node: selected, parent: null })}>Editar</button><button type="button" className="button button--quiet" onClick={() => hideNode(selected)}>Ocultar</button></div></aside>}
    </div>
  </div>;
}
