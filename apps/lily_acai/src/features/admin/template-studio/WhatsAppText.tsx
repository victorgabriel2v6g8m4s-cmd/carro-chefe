import type { ReactNode } from "react";

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(inlinePattern).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*")) return <strong key={key}>{part.slice(1, -1)}</strong>;
    if (part.startsWith("_")) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("~")) return <del key={key}>{part.slice(1, -1)}</del>;
    if (part.startsWith("```")) return <code key={key}>{part.slice(3, -3)}</code>;
    if (part.startsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    return part.split(/(https?:\/\/[^\s]+)/g).map((chunk, linkIndex) => /^https?:\/\//.test(chunk)
      ? <a key={`${key}-link-${linkIndex}`} href={chunk} target="_blank" rel="noreferrer">{chunk}</a>
      : chunk);
  });
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
