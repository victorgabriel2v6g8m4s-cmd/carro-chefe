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

function restoreEditorRange(editor: HTMLElement, range: Range) {
  editor.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function rangeHasFormat(editor: HTMLElement, range: Range, selector: string) {
  if (range.collapsed) {
    const selection = window.getSelection();
    return Boolean(selection?.anchorNode && editor.contains(selection.anchorNode)
      && selection.anchorNode.parentElement?.closest(selector));
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let foundText = false;
  let fullyFormatted = true;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.textContent?.trim() || !range.intersectsNode(node)) continue;
    foundText = true;
    if (!node.parentElement?.closest(selector)) fullyFormatted = false;
  }
  return foundText && fullyFormatted;
}

function formatSelector(action: string) {
  return ({ bold: "strong, b", italic: "em, i", strikeThrough: "s, strike, del" } as Record<string, string>)[action];
}

function setSelection(range: Range, saved: React.MutableRefObject<Range | null>) {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  saved.current = range.cloneRange();
}

function toggleInlineFormat(editor: HTMLElement, range: Range, saved: React.MutableRefObject<Range | null>, action: "bold" | "italic" | "strikeThrough") {
  if (range.startContainer !== range.endContainer || range.startContainer.nodeType !== Node.TEXT_NODE) {
    restoreEditorRange(editor, range);
    document.execCommand(action);
    return;
  }

  const text = range.startContainer as Text;
  const start = range.startOffset;
  const end = range.endOffset;
  if (start === end) {
    restoreEditorRange(editor, range);
    document.execCommand(action);
    return;
  }

  const tag = ({ bold: "strong", italic: "em", strikeThrough: "s" } as const)[action];
  const selector = formatSelector(action)!;
  const active = Boolean(text.parentElement?.closest(selector));
  let selectedText: Text;

  if (!active) {
    const wrapper = document.createElement(tag);
    range.surroundContents(wrapper);
    selectedText = wrapper.firstChild as Text;
  } else {
    const formatParent = text.parentElement?.closest(selector);
    if (!formatParent || formatParent !== text.parentElement) {
      restoreEditorRange(editor, range);
      document.execCommand(action);
      return;
    }

    if (end < text.length) text.splitText(end);
    selectedText = start > 0 ? text.splitText(start) : text;
    const parent = selectedText.parentElement!;
    const siblings = Array.from(parent.childNodes);
    const selectedIndex = siblings.indexOf(selectedText);
    const before = siblings.slice(0, selectedIndex);
    const after = siblings.slice(selectedIndex + 1);
    const replacement = document.createDocumentFragment();
    if (before.length) {
      const beforeFormat = parent.cloneNode(false) as HTMLElement;
      beforeFormat.append(...before);
      replacement.append(beforeFormat);
    }
    replacement.append(selectedText);
    if (after.length) {
      const afterFormat = parent.cloneNode(false) as HTMLElement;
      afterFormat.append(...after);
      replacement.append(afterFormat);
    }
    parent.replaceWith(replacement);
  }

  const nextRange = document.createRange();
  nextRange.setStart(selectedText, 0);
  nextRange.setEnd(selectedText, selectedText.length);
  setSelection(nextRange, saved);
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

  function syncActiveFormats() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
    editor.previousElementSibling?.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((button) => {
      const action = button.dataset.command!;
      const selector = formatSelector(action);
      const active = selector ? rangeHasFormat(editor, selection.getRangeAt(0), selector) : document.queryCommandState(action);
      button.setAttribute("aria-pressed", String(active));
    });
    editor.previousElementSibling?.querySelectorAll<HTMLButtonElement>("[data-tag]").forEach((button) => button.setAttribute("aria-pressed", String(Boolean(selection.anchorNode?.parentElement?.closest(button.dataset.tag!)))));
  }

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
    const range = currentRange(editor, savedRange);
    restoreEditorRange(editor, range);
    const selection = window.getSelection();
    if (action === "bold" || action === "italic" || action === "strikeThrough") toggleInlineFormat(editor, range, savedRange, action);
    else {
      // Restore after focus as browsers may collapse or move the selection on focus().
      const block = selection?.anchorNode?.parentElement?.closest("blockquote");
      document.execCommand(action, false, action === "formatBlock" && block ? "P" : value);
    }
    emitChange();
    syncActiveFormats();
  }

  function applyCode(inline: boolean) {
    const editor = editorRef.current;
    if (!editor) return;
    const range = currentRange(editor, savedRange);
    restoreEditorRange(editor, range);
    const selection = window.getSelection();
    const existing = selection?.anchorNode?.parentElement?.closest(inline ? "code" : "pre");
    if (existing && inline) existing.replaceWith(...Array.from(existing.childNodes));
    else if (existing) document.execCommand("formatBlock", false, "P");
    else if (range.collapsed) {
      const marker = inline ? "`código`" : "```\ntexto\n```";
      document.execCommand("insertText", false, marker);
    } else {
      const element = document.createElement(inline ? "code" : "pre");
      try { range.surroundContents(element); } catch { element.append(range.extractContents()); range.insertNode(element); }
    }
    emitChange();
    syncActiveFormats();
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
      <button type="button" data-command="bold" aria-label="Negrito" title="Negrito" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("bold")}><strong>B</strong></button>
      <button type="button" data-command="italic" aria-label="Itálico" title="Itálico" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("italic")}><em>I</em></button>
      <button type="button" data-command="strikeThrough" aria-label="Riscado" title="Riscado" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("strikeThrough")}><s>S</s></button>
      <button type="button" data-tag="pre" aria-label="Monoespaçado" title="Monoespaçado" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCode(false)}>```</button>
      <button type="button" data-tag="code" aria-label="Código em linha" title="Código em linha" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCode(true)}>`</button>
      <button type="button" data-command="insertUnorderedList" aria-label="Lista com marcadores" title="Lista com marcadores" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("insertUnorderedList")}>• Lista</button>
      <button type="button" data-command="insertOrderedList" aria-label="Lista numerada" title="Lista numerada" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("insertOrderedList")}>1. Lista</button>
      <button type="button" data-tag="blockquote" aria-label="Citação" title="Citação" aria-pressed="false" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyToolbar("formatBlock", "BLOCKQUOTE")}>❞</button>
    </div>
    <div ref={editorRef} className="template-rich-textarea" role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning data-placeholder={placeholder} data-empty={value.length === 0} style={{ minHeight: `${rows * 25}px` }}
      onFocus={() => { activate(); syncActiveFormats(); }} onClick={() => { activate(); syncActiveFormats(); }} onMouseUp={syncActiveFormats} onKeyDown={handleKeyDown} onKeyUp={() => { activate(); syncActiveFormats(); }} onInput={emitChange} onCopy={(event) => handleCopy(event, false)} onCut={(event) => handleCopy(event, true)} onPaste={handlePaste} onDragStart={(event) => {
        const token = (event.target as HTMLElement).closest<HTMLElement>("[data-template-variable]");
        if (token) event.dataTransfer.setData(TOKEN_MIME, token.dataset.templateVariable || "");
      }} onDragOver={(event) => { if (event.dataTransfer.types.includes(TOKEN_MIME)) event.preventDefault(); }} onDrop={handleDrop} />
    {maxLength !== undefined && <small>{value.length}/{maxLength}{hint ? ` · ${hint}` : ""}</small>}
    {maxLength === undefined && hint && <small>{hint}</small>}
  </div>;
}

