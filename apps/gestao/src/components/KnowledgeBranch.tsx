import { KnowledgeFilePreview } from "./KnowledgeFilePreview";

export function KnowledgeBranch({ node, childrenByParent, expanded, loading, hidden, onToggle, onSelect, onHide }:
  { node: any; childrenByParent: Map<string, any[]>; expanded: Set<string>; loading: Set<string>; hidden: Set<string>; onToggle: (node: any) => void; onSelect: (node: any) => void; onHide: (node: any) => void }) {
  if (hidden.has(node.id)) return null;
  const open = expanded.has(node.id);
  const children = childrenByParent.get(node.id) ?? [];
  return <li className={`knowledge-branch ${open ? "is-open" : ""}`}>
    <article className={`knowledge-node knowledge-node--${node.kind}`}>
      <div><button type="button" className="knowledge-node-main" onClick={() => onSelect(node)}><small>{node.path}</small><strong>{node.name}</strong>{node.value && <span>{node.value}</span>}</button>
        <div className="knowledge-node-actions">{node.childCount > 0 && <button type="button" onClick={() => onToggle(node)} aria-expanded={open} aria-label={`${open ? "Ocultar" : "Abrir"} ramo ${node.name}`}>{loading.has(node.id) ? "…" : open ? "−" : "+"}</button>}<button type="button" onClick={() => onHide(node)} aria-label={`Ocultar ${node.name}`}>◌</button></div></div>
      {node.attachments?.length > 0 && <div className="knowledge-node-files">{node.attachments.slice(0, 2).map((item: any) => <KnowledgeFilePreview key={item.id} upload={item} compact />)}</div>}
    </article>
    {open && <ul>{children.map((child) => <KnowledgeBranch key={child.id} node={child} childrenByParent={childrenByParent} expanded={expanded} loading={loading} hidden={hidden} onToggle={onToggle} onSelect={onSelect} onHide={onHide} />)}{!loading.has(node.id) && !children.length && <li className="knowledge-empty-child">Ramo vazio</li>}</ul>}
  </li>;
}
