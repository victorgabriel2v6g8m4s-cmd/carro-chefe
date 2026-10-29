import { useEffect, useRef, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";

type Props = {
  label: string;
  value: string;
  variableNames: string[];
  onChange: (value: string) => void;
  onActivate: (insert: (number: number, name?: string) => void) => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
  placeholder?: string;
};

const TOKEN_MIME = "application/x-cooklily-template-variable";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function inlineHtml(value: string, names: string[]) {
  const pattern = /(\{\{\s*\d+\s*\}\}|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g;
  let html = ""; let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0; const token = match[0];
    html += escapeHtml(value.slice(cursor, index));
    const variable = token.match(/^\{\{\s*(\d+)\s*\}\}$/);
    if (variable) {
      const number = Number(variable[1]); const name = names[number - 1] || `variavel_${number}`;
      html += `<span class="template-variable-token" data-template-variable="${number}" contenteditable="false" draggable="true">${escapeHtml(name)}</span>`;
    } else if (token.startsWith("*")) html += `<strong>${inlineHtml(token.slice(1, -1), names)}</strong>`;
    else if (token.startsWith("_")) html += `<em>${inlineHtml(token.slice(1, -1), names)}</em>`;
    else if (token.startsWith("~")) html += `<s>${inlineHtml(token.slice(1, -1), names)}</s>`;
    else html += `<code>${inlineHtml(token.slice(1, -1), names)}</code>`;
    cursor = index + token.length;
  }
  return html + escapeHtml(value.slice(cursor));
}

function markdownToHtml(value: string, names: string[]) {
  const lines = value.split("\n"); const output: string[] = []; let list: "ul" | "ol" | null = null; let code: string[] | null = null;
  const closeList = () => { if (list) output.push(`</${list}>`); list = null; };
  for (const line of lines) {
    if (line.trim().startsWith("```") ) {
      if (code) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = null; }
      else { closeList(); code = []; }
      continue;
    }
    if (code) { code.push(line); continue; }
    const bullet = line.match(/^\s*[*-]\s+(.*)$/); const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) { closeList(); output.push(`<${kind}>`); list = kind; }
      output.push(`<li>${inlineHtml((bullet || ordered)![1], names)}</li>`); continue;
    }
    closeList();
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) output.push(`<blockquote>${inlineHtml(quote[1], names)}</blockquote>`);
    else output.push(`<div>${inlineHtml(line, names) || "<br>"}</div>`);
  }
  closeList();
  if (code) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("") || "<div><br></div>";
}

function nodeMarkdown(node: Node, parent?: Node): string {
  if (node instanceof HTMLElement && node.dataset.templateVariable) return `{{${node.dataset.templateVariable}}}`;
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  const children = Array.from(node.childNodes).map((child) => nodeMarkdown(child, node)).join("");
  if (!(node instanceof HTMLElement)) return children;
  const tag = node.tagName;
  if (tag === "STRONG" || tag === "B") return `*${children}*`;
  if (tag === "EM" || tag === "I") return `_${children}_`;
  if (["S", "STRIKE", "DEL"].includes(tag)) return `~${children}~`;
  if (tag === "CODE" && parent?.nodeName !== "PRE") return `\`${children}\``;
  if (tag === "PRE") return `\`\`\`\n${children.replace(/\n$/, "")}\n\`\`\``;
  if (tag === "BLOCKQUOTE") return children.split("\n").map((line) => `> ${line}`).join("\n");
  if (tag === "LI") return `* ${children}`;
  if (["UL", "OL"].includes(tag)) return Array.from(node.children).map((child, index) => {
    const content = nodeMarkdown(child, node).replace(/^(?:\*|-|\d+\.)\s+/, "");
    return tag === "OL" ? `${index + 1}. ${content}` : `* ${content}`;
  }).join("\n");
  if (["DIV", "P"].includes(tag)) return `${children}${parent?.nodeName === "UL" || parent?.nodeName === "OL" ? "" : "\n"}`;
  if (tag === "BR") return "\n";
  return children;
}

function editorMarkdown(editor: HTMLElement) {
  return Array.from(editor.childNodes).map((node) => nodeMarkdown(node)).join("")
    .replace(/\n+$/, "").replace(/\u00a0/g, " ");
}

function tokenElement(number: number, name: string) {
  const token = document.createElement("span");
  token.className = "template-variable-token";
  token.dataset.templateVariable = String(number);
  token.contentEditable = "false";
  token.draggable = true;
  token.textContent = name;
  return token;
}

function currentRange(editor: HTMLElement, saved: React.MutableRefObject<Range | null>) {
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) saved.current = selection.getRangeAt(0).cloneRange();
  const range = saved.current?.cloneRange() ?? document.createRange();
  if (!saved.current) { range.selectNodeContents(editor); range.collapse(false); }
  return range;
}

function insertToken(editor: HTMLElement, saved: React.MutableRefObject<Range | null>, number: number, name: string) {
  editor.focus();
  const range = currentRange(editor, saved);
  range.deleteContents();
  const token = tokenElement(number, name); const spacer = document.createTextNode(" ");
  range.insertNode(token); token.after(spacer); range.setStartAfter(spacer); range.collapse(true);
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); saved.current = range.cloneRange();
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
}

function isVariableToken(node: Node | null): node is HTMLElement {
  return node instanceof HTMLElement && Boolean(node.dataset.templateVariable);
}

export function TemplateTextEditor({ label, value, variableNames, onChange, onActivate, disabled, rows = 4, maxLength, hint, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (lastEmitted.current === value) lastEmitted.current = null;
    else editor.innerHTML = markdownToHtml(value, variableNames);
    editor.querySelectorAll<HTMLElement>("[data-template-variable]").forEach((token) => {
      const number = Number(token.dataset.templateVariable);
      token.textContent = variableNames[number - 1] || `variavel_${number}`;
    });
  }, [value, variableNames]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    currentRange(editor, savedRange);
    const next = editorMarkdown(editor);
    if (maxLength !== undefined && next.length > maxLength) {
      editor.innerHTML = markdownToHtml(value, variableNames);
      savedRange.current = null;
      return;
    }
    lastEmitted.current = next;
    onChange(next);
  }

  function activate() {
    const editor = editorRef.current;
    if (editor) onActivate((number, name) => insertToken(editor, savedRange, number, name || variableNames[number - 1] || `variavel_${number}`));
  }

  function applyToolbar(action: "bold" | "italic" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "formatBlock", value?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = currentRange(editor, savedRange); const selection = window.getSelection();
    selection?.removeAllRanges(); selection?.addRange(range);
    const inlineTag = action === "bold" ? "strong" : action === "italic" ? "em" : action === "strikeThrough" ? "s" : null;
    if (inlineTag && !range.collapsed) {
      const wrapper = document.createElement(inlineTag);
      try { range.surroundContents(wrapper); }
      catch { wrapper.append(range.extractContents()); range.insertNode(wrapper); }
      range.selectNodeContents(wrapper);
      selection?.removeAllRanges(); selection?.addRange(range);
      savedRange.current = range.cloneRange();
    } else document.execCommand(action, false, value);
    emitChange();
  }

  function applyCode(inline: boolean) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = currentRange(editor, savedRange);
    if (range.collapsed) {
      const marker = inline ? "`código`" : "```\ntexto\n```";
      document.execCommand("insertText", false, marker);
    } else {
      const element = document.createElement(inline ? "code" : "pre");
      try { range.surroundContents(element); } catch { element.append(range.extractContents()); range.insertNode(element); }
    }
    emitChange();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const raw = event.dataTransfer.getData(TOKEN_MIME);
    if (!raw) return;
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;
    const position = document.caretPositionFromPoint?.(event.clientX, event.clientY);
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    const targetRange = document.createRange();
    if (position && editor.contains(position.offsetNode)) targetRange.setStart(position.offsetNode, position.offset);
    else if (range && editor.contains(range.startContainer)) targetRange.setStart(range.startContainer, range.startOffset);
    else { targetRange.selectNodeContents(editor); targetRange.collapse(false); }
    targetRange.collapse(true); savedRange.current = targetRange;
    const number = Number(raw); insertToken(editor, savedRange, number, variableNames[number - 1] || `variavel_${number}`);
  }

  function handleCopy(event: ClipboardEvent<HTMLDivElement>, cut: boolean) {
    if (!window.getSelection()?.toString()) return;
    const range = window.getSelection()!.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    const fragment = range.cloneContents(); const container = document.createElement("div"); container.append(fragment);
    event.clipboardData.setData("text/html", container.innerHTML);
    event.clipboardData.setData("text/plain", editorMarkdown(container));
    event.preventDefault();
    if (cut) { range.deleteContents(); savedRange.current = range.cloneRange(); emitChange(); }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    const html = event.clipboardData.getData("text/html");
    if (!editor || !html) return;
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const tokens = parsed.querySelectorAll<HTMLElement>("[data-template-variable]");
    if (!tokens.length) return;
    event.preventDefault();
    const safeFragment = document.createDocumentFragment();
    const visit = (node: Node): Node[] => {
      if (node instanceof HTMLElement && node.dataset.templateVariable) {
        const number = Number(node.dataset.templateVariable);
        const token = tokenElement(number, variableNames[number - 1] || `variavel_${number}`);
        return [token];
      }
      if (node.nodeType === Node.TEXT_NODE) return [document.createTextNode(node.textContent ?? "")];
      if (!(node instanceof HTMLElement)) return [];
      const tag = node.tagName;
      const allowed: Record<string, string> = { STRONG: "strong", B: "strong", EM: "em", I: "em", S: "s", DEL: "s", BLOCKQUOTE: "blockquote", CODE: "code", PRE: "pre", DIV: "div", P: "div", BR: "br", UL: "ul", OL: "ol", LI: "li" };
      const safeTag = allowed[tag];
      const element = safeTag ? document.createElement(safeTag) : null;
      const children = Array.from(node.childNodes).flatMap(visit);
      if (!element) return children;
      element.append(...children);
      return [element];
    };
    for (const node of Array.from(parsed.body.childNodes)) safeFragment.append(...visit(node));
    const range = currentRange(editor, savedRange); range.deleteContents(); range.insertNode(safeFragment);
    range.collapse(false); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); savedRange.current = range.cloneRange(); emitChange();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let token: HTMLElement | null = null;
    if (isVariableToken(range.startContainer)) token = range.startContainer;
    else if (range.startContainer instanceof Text && range.startContainer.parentElement?.dataset.templateVariable) token = range.startContainer.parentElement;
    else if (range.startContainer instanceof HTMLElement) {
      const childIndex = range.startOffset + (event.key === "Backspace" ? -1 : 0);
      const candidate = range.startContainer.childNodes[childIndex];
      if (isVariableToken(candidate)) token = candidate;
    }
    if (!token || !editorRef.current?.contains(token)) return;
    event.preventDefault();
    const nextRange = document.createRange();
    nextRange.setStartBefore(token); nextRange.collapse(true); token.remove();
    selection.removeAllRanges(); selection.addRange(nextRange); savedRange.current = nextRange.cloneRange(); emitChange();
  }

  return <div className="template-rich-editor">
    <div className="template-format-toolbar" role="toolbar" aria-label={`Formatação de ${label}`}>
      <button type="button" aria-label="Negrito" title="Negrito" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("bold")}><strong>B</strong></button>
      <button type="button" aria-label="Itálico" title="Itálico" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("italic")}><em>I</em></button>
      <button type="button" aria-label="Riscado" title="Riscado" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("strikeThrough")}><s>S</s></button>
      <button type="button" aria-label="Monoespaçado" title="Monoespaçado" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCode(false)}>```</button>
      <button type="button" aria-label="Código em linha" title="Código em linha" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCode(true)}>`</button>
      <button type="button" aria-label="Lista com marcadores" title="Lista com marcadores" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("insertUnorderedList")}>• Lista</button>
      <button type="button" aria-label="Lista numerada" title="Lista numerada" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("insertOrderedList")}>1. Lista</button>
      <button type="button" aria-label="Citação" title="Citação" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("formatBlock", "BLOCKQUOTE")}>❞</button>
    </div>
    <div ref={editorRef} className="template-rich-textarea" role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning data-placeholder={placeholder} data-empty={value.length === 0} style={{ minHeight: `${rows * 25}px` }}
      onFocus={activate} onClick={activate} onKeyDown={handleKeyDown} onKeyUp={() => { activate(); if (editorRef.current) currentRange(editorRef.current, savedRange); }} onInput={emitChange} onCopy={(event) => handleCopy(event, false)} onCut={(event) => handleCopy(event, true)} onPaste={handlePaste} onDragStart={(event) => {
        const token = (event.target as HTMLElement).closest<HTMLElement>("[data-template-variable]");
        if (token) event.dataTransfer.setData(TOKEN_MIME, token.dataset.templateVariable || "");
      }} onDragOver={(event) => { if (event.dataTransfer.types.includes(TOKEN_MIME)) event.preventDefault(); }} onDrop={handleDrop} />
    {maxLength !== undefined && <small>{value.length}/{maxLength}{hint ? ` · ${hint}` : ""}</small>}
    {maxLength === undefined && hint && <small>{hint}</small>}
  </div>;
}

