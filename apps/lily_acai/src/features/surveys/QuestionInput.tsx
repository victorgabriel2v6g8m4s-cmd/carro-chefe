import { useRef, useState, type PointerEvent } from "react";
import { uploadSurveyAnswer, type SurveyQuestion } from "./api";

export function QuestionInput({ question, value, onChange, surveyId, disabled = false }: {
  question: SurveyQuestion; value: unknown; onChange: (value: unknown) => void; surveyId: string; disabled?: boolean;
}) {
  const selected = Array.isArray(value) ? value.map(String) : [];
  const options = question.options ?? [];
  if (question.type === "single_choice") return <div className="survey-options">{options.map((option) => <label key={option}><input disabled={disabled} type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div>;
  if (question.type === "dropdown") return <select disabled={disabled} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}><option value="">Selecione</option>{options.map((option) => <option key={option}>{option}</option>)}</select>;
  if (["multiple_choice", "checkboxes"].includes(question.type)) return <div className="survey-options">{options.map((option) => <label key={option}><input disabled={disabled} type="checkbox" checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div>;
  if (question.type === "choice_text") { const current = (value ?? {}) as { choice?: string; text?: string }; return <div className="survey-answer-stack"><select disabled={disabled} value={current.choice ?? ""} onChange={(event) => onChange({ ...current, choice: event.target.value })}><option value="">Selecione</option>{options.map((option) => <option key={option}>{option}</option>)}</select>{question.textAfterChoice && <textarea disabled={disabled} rows={3} value={current.text ?? ""} placeholder="Acrescente um comentário" onChange={(event) => onChange({ ...current, text: event.target.value })} />}</div>; }
  if (question.type === "binary_swipe") return <BinarySwipe question={question} value={value} onChange={onChange} disabled={disabled} />;
  if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) return <GridAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
  if (question.type === "linear_scale") return <div className="survey-scale">{Array.from({ length: (question.scale?.max ?? 5) - (question.scale?.min ?? 1) + 1 }, (_, index) => (question.scale?.min ?? 1) + index).map((number) => <label key={number}><input disabled={disabled} type="radio" name={question.id} checked={Number(value) === number} onChange={() => onChange(number)} />{number}</label>)}</div>;
  if (question.type === "free_text" && question.media) { const response = (value && typeof value === "object" ? value : {}) as { text?: string; upload?: unknown }; return <div className="survey-answer-stack"><textarea disabled={disabled} rows={4} maxLength={10000} value={response.text ?? ""} onChange={(event) => onChange({ ...response, text: event.target.value })} /><SurveyMediaAnswer question={question} value={response.upload} onChange={(upload) => onChange({ ...response, upload })} surveyId={surveyId} disabled={disabled} /></div>; }
  if (question.type === "media") return <SurveyMediaAnswer question={question} value={value} onChange={onChange} surveyId={surveyId} disabled={disabled} />;
  if (question.type === "free_text" || question.type === "paragraph") return <textarea disabled={disabled} rows={question.type === "paragraph" ? 6 : 3} maxLength={10000} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  if (question.type === "date" || question.type === "datetime") return <input disabled={disabled} type={question.type === "date" ? "date" : "datetime-local"} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  return <input disabled={disabled} type="text" maxLength={question.type === "short_answer" ? 500 : 10000} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
}

function GridAnswer({ question, value, onChange, disabled }: { question: SurveyQuestion; value: unknown; onChange: (value: unknown) => void; disabled: boolean }) {
  const grid = (value ?? {}) as Record<string, unknown>;
  return <div className="survey-grid-wrap"><table className="survey-grid"><thead><tr><th></th>{question.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{question.rows.map((row) => <tr key={row}><th>{row}</th>{question.columns.map((column) => <td key={column}><input disabled={disabled} type={question.type === "checkbox_grid" ? "checkbox" : "radio"} name={`${question.id}-${row}`} checked={question.type === "checkbox_grid" ? Array.isArray(grid[row]) && (grid[row] as string[]).includes(column) : grid[row] === column} onChange={(event) => onChange({ ...grid, [row]: question.type === "checkbox_grid" ? (event.target.checked ? [...((grid[row] as string[] | undefined) ?? []), column] : ((grid[row] as string[] | undefined) ?? []).filter((item) => item !== column)) : column })} /></td>)}</tr>)}</tbody></table></div>;
}

function BinarySwipe({ question, value, onChange, disabled }: { question: SurveyQuestion; value: unknown; onChange: (value: unknown) => void; disabled: boolean }) {
  const startX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const positiveLabel = question.positiveLabel || "Positivo";
  const negativeLabel = question.negativeLabel || "Negativo";
  const strength = Math.min(Math.abs(dragX) / 220, 1);
  const direction = dragX > 0 ? "positive" : dragX < 0 ? "negative" : "neutral";
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || value) return;
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (startX.current !== null) setDragX(event.clientX - startX.current);
  }
  function pointerUp() {
    if (startX.current === null) return;
    if (Math.abs(dragX) >= 78) onChange(dragX > 0 ? "positive" : "negative");
    startX.current = null;
    setDragX(0);
    setDragging(false);
  }
  return <div className="binary-swipe-wrap">
    <p className="binary-swipe-hint">Arraste para a esquerda para <strong>{negativeLabel}</strong> e para a direita para <strong>{positiveLabel}</strong>.</p>
    <div className={`binary-swipe-card is-${direction} ${dragging ? "is-dragging" : ""} ${value ? `is-${value}` : ""}`} style={{ transform: `translateX(${dragX}px) scale(${1 - strength * 0.16})`, backgroundColor: direction === "positive" ? `color-mix(in srgb, #42a56b ${strength * 55}%, white)` : direction === "negative" ? `color-mix(in srgb, #d7505d ${strength * 55}%, white)` : undefined }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label={`Cartão para responder: ${question.title}`}>
      {question.cardMedia && (question.cardMedia.type === "video" ? <video src={question.cardMedia.url} controls playsInline aria-label={question.cardMedia.altText || question.title} /> : <img src={question.cardMedia.url} alt={question.cardMedia.altText || question.title} />)}
      <strong>{question.title}</strong>
      {question.description && <span>{question.description}</span>}
      <span className={`binary-swipe-stamp ${direction}`}>{direction === "positive" ? positiveLabel : direction === "negative" ? negativeLabel : value === "positive" ? positiveLabel : value === "negative" ? negativeLabel : "Arraste"}</span>
    </div>
    <div className="binary-swipe-actions"><button type="button" className="binary-negative" disabled={disabled} onClick={() => onChange("negative")}>← {negativeLabel}</button><button type="button" className="binary-positive" disabled={disabled} onClick={() => onChange("positive")}>{positiveLabel} →</button></div>
  </div>;
}

function SurveyMediaAnswer({ question, value, onChange, surveyId, disabled }: { question: SurveyQuestion; value: unknown; onChange: (value: unknown) => void; surveyId: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div><input type="file" disabled={disabled} accept={question.media?.mimeTypes.join(",")} onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; if (file.size > (question.media?.maxBytes ?? 0)) { setError("O arquivo excede o limite desta pergunta."); return; } setBusy(true); setError(""); try { const uploaded = await uploadSurveyAnswer(surveyId, question.id, file); onChange(uploaded); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao enviar arquivo."); } finally { setBusy(false); input.value = ""; } }} />{busy && <p>Enviando arquivo…</p>}{(value as { name?: string } | undefined)?.name && <p>Anexo enviado: {(value as { name: string }).name}</p>}{error && <p className="error" role="alert">{error}</p>}</div>;
}
