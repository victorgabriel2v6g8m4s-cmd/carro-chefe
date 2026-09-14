import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { messages } from "../i18n";
import type { ScopedReference } from "../types";

export type { ScopedReference } from "../types";

const referenceCache = new Map<string, Promise<ScopedReference[]>>();

function loadReferences(taskId?: string) {
  const key = taskId ?? "project";
  if (!referenceCache.has(key)) referenceCache.set(key, api<ScopedReference[]>(`/api/v1/references?limit=120${taskId ? `&taskId=${encodeURIComponent(taskId)}` : ""}`));
  return referenceCache.get(key)!;
}

export function ReferenceComposer({ value, onChange, references, onReferencesChange, taskId, placeholder, disabled = false, required = true }:
  { value: string; onChange: (value: string) => void; references: ScopedReference[]; onReferencesChange: (items: ScopedReference[]) => void; taskId?: string; placeholder?: string; disabled?: boolean; required?: boolean }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [available, setAvailable] = useState<ScopedReference[]>([]);
  const [mention, setMention] = useState<{ start: number; end: number; query: string } | null>(null);

  async function ensureLoaded() {
    if (!available.length) setAvailable(await loadReferences(taskId));
  }

  function updateMention(next: string, cursor: number) {
    const prefix = next.slice(0, cursor);
    const match = prefix.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) return setMention(null);
    const at = prefix.lastIndexOf("@");
    setMention({ start: at, end: cursor, query: match[1].toLocaleLowerCase("pt-BR") });
    void ensureLoaded();
  }

  function change(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
    updateMention(event.target.value, event.target.selectionStart);
  }

  function select(reference: ScopedReference) {
    if (!mention) return;
    const next = `${value.slice(0, mention.start)}@${reference.id} ${value.slice(mention.end)}`;
    onChange(next);
    if (!references.some((item) => item.id === reference.id && item.type === reference.type)) onReferencesChange([...references, reference]);
    setMention(null);
    requestAnimationFrame(() => textarea.current?.focus());
  }

  const suggestions = mention ? available.filter((item) => `${item.id} ${item.label}`.toLocaleLowerCase("pt-BR").includes(mention.query)).slice(0, 8) : [];
  return <div className="reference-composer">
    <textarea ref={textarea} required={required} minLength={required ? 2 : undefined} disabled={disabled} value={value} onFocus={() => void ensureLoaded()} onChange={change} onKeyUp={(event) => updateMention(event.currentTarget.value, event.currentTarget.selectionStart)} placeholder={placeholder} />
    {mention && <div className="mention-menu" role="listbox" aria-label={messages.common.references.search}>{suggestions.length ? suggestions.map((reference) => <button type="button" role="option" key={`${reference.type}-${reference.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => select(reference)}><small>@{reference.id} · {reference.type}</small><strong>{reference.label}</strong>{reference.detail && <span>{reference.detail}</span>}</button>) : <p>{messages.common.references.noMatches}</p>}</div>}
    <small className="composer-hint">{messages.common.references.search}</small>
    {references.length > 0 && <div className="selected-references">{references.map((reference) => <span key={`${reference.type}-${reference.id}`}><b>@{reference.id}</b>{reference.route && <Link to={reference.route}>{messages.common.actions.open}</Link>}<button type="button" aria-label={`${messages.common.references.removeReference} ${reference.id}`} onClick={() => onReferencesChange(references.filter((item) => item !== reference))}>×</button></span>)}</div>}
  </div>;
}
