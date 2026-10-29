import type { ReactNode } from "react";

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const start = match.index ?? 0;
    const token = match[0];
    const key = `${keyPrefix}-${start}`;
    if (start > cursor) nodes.push(...renderPlain(text.slice(cursor, start), key));
    const triple = token.startsWith("```");
    const double = token.startsWith("**");
    const content = token.slice(triple || double ? 2 + Number(triple) : 1, -(triple || double ? 2 + Number(triple) : 1));
    const children = triple ? content : renderInline(content, key);
    if (triple || token.startsWith("`")) nodes.push(<code key={key}>{triple ? content : token.slice(1, -1)}</code>);
    else if (token.startsWith("*")) nodes.push(<strong key={key}>{children}</strong>);
    else if (token.startsWith("_")) nodes.push(<em key={key}>{children}</em>);
    else nodes.push(<del key={key}>{children}</del>);
    cursor = start + token.length;
  }
  if (cursor < text.length) nodes.push(...renderPlain(text.slice(cursor), `${keyPrefix}-${cursor}`));
  return nodes;
}

function renderPlain(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((chunk, index) => /^https?:\/\//.test(chunk)
    ? <a key={`${keyPrefix}-link-${index}`} href={chunk} target="_blank" rel="noreferrer">{chunk}</a>
    : chunk);
}

export function WhatsAppText({ text }: { text: string }) {
  return <span className="whatsapp-rendered-text">{text.split("\n").map((line, index) => {
    const quote = line.startsWith("> ");
    const bullet = /^[-*] /.test(line);
    const numbered = /^\d+\. /.test(line);
    const content = quote ? line.slice(2) : bullet || numbered ? line.replace(/^(?:[-*]|\d+\.) /, "") : line;
    return <span className={quote ? "wa-quote" : bullet ? "wa-bullet" : numbered ? "wa-numbered" : undefined} key={index}>{renderInline(content, `line-${index}`)}{index < text.split("\n").length - 1 && <br />}</span>;
  })}</span>;
}
