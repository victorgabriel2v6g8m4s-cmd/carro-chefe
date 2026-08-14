import { Link } from "react-router-dom";

const tokenPattern = /(https?:\/\/[^\s<>"']+|\/api\/v1\/uploads\/[^\s/]+\/content|(?:[A-Za-z]:\\[^\r\n]+?|(?:apps|packages|docs|site|planejamento|logos|cardápio|elementos gráficos|output)[\\/][^\r\n]+?)\.(?:tsx?|jsx?|css|html?|md|json|ya?ml|sql|prisma|csv|png|jpe?g|webp|gif|svg|pdf|docx?|xlsx?))(?=$|[\s),;])/giu;

function labelForFile(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? value;
}

export function RichReferences({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const target = match[0];
    const upload = target.match(/^\/api\/v1\/uploads\/([^/]+)\/content$/i);
    if (upload) parts.push(<Link className="reference-link" key={`${start}-${target}`} to={`/gestao/visualizador?uploadId=${encodeURIComponent(upload[1])}`}>arquivo anexado</Link>);
    else if (/^https?:\/\//i.test(target)) parts.push(<Link className="reference-link" key={`${start}-${target}`} to={`/gestao/navegador?url=${encodeURIComponent(target)}`}>{target}</Link>);
    else parts.push(<Link className="reference-link" key={`${start}-${target}`} to={`/gestao/visualizador?path=${encodeURIComponent(target)}`}>{labelForFile(target)}</Link>);
    last = start + target.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}
