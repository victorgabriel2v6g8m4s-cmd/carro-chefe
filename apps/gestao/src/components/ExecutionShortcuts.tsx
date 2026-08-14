import { Link } from "react-router-dom";

export function ExecutionShortcuts({ shortcuts }: { shortcuts: Array<{ id: string; label: string; description: string; route: string; emphasis: string }> }) {
  if (!shortcuts?.length) return null;
  return <nav className="execution-shortcuts" aria-label="Próximas ações sugeridas"><span>Atalhos relevantes</span><div>{shortcuts.map((shortcut) => <Link key={shortcut.id} className={`execution-shortcut execution-shortcut--${shortcut.emphasis}`} to={shortcut.route}><strong>{shortcut.label}</strong><small>{shortcut.description}</small><b aria-hidden="true">→</b></Link>)}</div></nav>;
}
