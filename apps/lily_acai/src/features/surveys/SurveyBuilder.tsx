import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";
import { QuestionInput } from "./QuestionInput";
import { surveyJson, surveyOptionLabel, surveyOptionValue, uploadSurveyOptionMedia, type SurveyAnalytics, type SurveyDefinition, type SurveyOption, type SurveyQuestion, type SurveyVisibility } from "./api";
import { SurveyAnalyticsPanel } from "./SurveyAnalyticsPanel";

type SurveyRow = { id: string; title: string; subtitle: string | null; description: string | null; estimatedMinutes: number; questionCount?: number; points: number | null; showPoints?: boolean; definition?: SurveyDefinition; status?: string; version?: number; createdAt: string; viewCount: number; responseCount: number };
const SAFE_MEDIA_BYTES = 10 * 1024 * 1024;
const mediaUnits = [{ name: "bytes", size: 1 }, { name: "KB", size: 1024 }, { name: "MB", size: 1024 ** 2 }, { name: "GB", size: 1024 ** 3 }] as const;
const mediaTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "audio/mpeg", "audio/mp4", "video/mp4"];
const questionLabels: Record<string, string> = { single_choice:"Seleção única", multiple_choice:"Seleção múltipla", free_text:"Texto livre", media:"Mídia", choice_text:"Seleção + texto", binary_swipe:"Cartão positivo/negativo", short_answer:"Resposta curta", paragraph:"Parágrafo", checkboxes:"Caixas de seleção", dropdown:"Lista suspensa", linear_scale:"Escala linear", multiple_choice_grid:"Grade de múltipla escolha", checkbox_grid:"Grade de caixas de seleção", date:"Data", datetime:"Data e hora" };

function newQuestion(type: string = "short_answer"): SurveyQuestion {
  return { id: crypto.randomUUID(), type, title: "", description: "", required: false, options: [], rows: [], columns: [], style: { fontSize: "md", bold: false, italic: false, markdown: false } };
}

function newDefinition(): SurveyDefinition {
  return { title: "", subtitle: "", description: "", questions: [newQuestion("single_choice")], prerequisites: [], unlocksMissions: [], pointsPerForm: 0, pointsPerAnswer: 0, showPoints: false, allowNavigation: true, mediaMimeTypes: [], mediaMaxBytes: 0, estimatedMinutes: 5 };
}

function definitionForSave(definition: SurveyDefinition): SurveyDefinition {
  const questionMedia = definition.questions.flatMap((question) => question.media ? [question.media] : []);
  return { ...definition, mediaMimeTypes: [...new Set(questionMedia.flatMap((media) => media.mimeTypes))], mediaMaxBytes: Math.max(0, ...questionMedia.map((media) => media.maxBytes)) };
}

function addGeneratedQuestionIds(definition: SurveyDefinition): SurveyDefinition {
  const ids = new Map(definition.questions.map((question) => [question.id, crypto.randomUUID()]));
  return { ...definition, questions: definition.questions.map((question) => ({ ...question, id: ids.get(question.id)!, visibility: question.visibility ? { ...question.visibility, questionId: ids.get(question.visibility.questionId) ?? question.visibility.questionId } : undefined })) };
}

function QuestionVisibilityRule({ question, previousQuestions, update }: { question: SurveyQuestion; previousQuestions: SurveyQuestion[]; update: (patch: Partial<SurveyQuestion>) => void }) {
  const condition = question.visibility;
  const parent = previousQuestions.find((item) => item.id === condition?.questionId);
  const choiceValues = parent?.type === "binary_swipe" ? ["positive", "negative"] : parent?.options.map(surveyOptionValue) ?? [];
  const choiceLabels = parent?.type === "binary_swipe" ? [parent.positiveLabel || "Positivo", parent.negativeLabel || "Negativo"] : parent?.options.map((option, index) => surveyOptionLabel(option, index)) ?? [];
  const supportsChoice = Boolean(parent && ["single_choice", "multiple_choice", "checkboxes", "dropdown", "choice_text", "binary_swipe"].includes(parent.type));
  const isMultiple = Boolean(parent && ["multiple_choice", "checkboxes"].includes(parent.type));
  function updateCondition(next: SurveyVisibility | undefined) { update({ visibility: next }); }
  function setQuestion(questionId: string) {
    const source = previousQuestions.find((item) => item.id === questionId);
    if (!source) { updateCondition(undefined); return; }
    const isMultiple = ["multiple_choice", "checkboxes"].includes(source.type);
    const values = source.type === "binary_swipe" ? ["positive", "negative"] : source.options.map(surveyOptionValue);
    const sourceSupportsChoice = ["single_choice", "multiple_choice", "checkboxes", "dropdown", "choice_text", "binary_swipe"].includes(source.type);
    updateCondition(sourceSupportsChoice && values.length ? { questionId, operator: isMultiple ? "contains" : "equals", value: values[0] } : { questionId, operator: "answered" });
  }
  return <div className="survey-visibility-rule"><label>Exibição condicional<select value={condition?.questionId ?? ""} onChange={(event) => setQuestion(event.target.value)}><option value="">Sempre exibir</option>{previousQuestions.map((item) => <option key={item.id} value={item.id}>{item.title || `Pergunta ${previousQuestions.indexOf(item) + 1}`}</option>)}</select></label>{condition && parent && <><label>Mostrar quando<select value={condition.operator} onChange={(event) => updateCondition({ ...condition, operator: event.target.value as SurveyVisibility["operator"], value: event.target.value === "equals" || event.target.value === "contains" ? choiceValues[0] : undefined })}><option value="answered">a pergunta anterior for respondida</option><option value="not_answered">a pergunta anterior ficar sem resposta</option>{supportsChoice && !isMultiple && <option value="equals">a resposta for</option>}{isMultiple && <option value="contains">a seleção incluir</option>}</select></label>{["equals", "contains"].includes(condition.operator) && <label>Resposta que ativa esta pergunta<select required value={condition.value ?? ""} onChange={(event) => updateCondition({ ...condition, value: event.target.value })}>{choiceValues.map((value, index) => <option key={value} value={value}>{choiceLabels[index]}</option>)}</select></label>}<small>Esta pergunta só aparece quando a condição for atendida.</small></>}</div>;
}

function RichOptionEditor({ items, onChange }: { items: SurveyOption[]; onChange: (items: SurveyOption[]) => void }) {
  const [busyOption, setBusyOption] = useState("");
  const [error, setError] = useState("");
  function update(index: number, next: SurveyOption) { onChange(items.map((item, itemIndex) => itemIndex === index ? next : item)); }
  async function upload(index: number, file?: File) {
    if (!file) return;
    setBusyOption(String(index)); setError("");
    try {
      const media = await uploadSurveyOptionMedia(file);
      const option = items[index];
      const current = typeof option === "string" ? { value: option, text: option } : option;
      update(index, { ...current, media: { url: media.url, type: media.type, altText: current.media?.altText ?? "" } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível anexar essa mídia."); }
    finally { setBusyOption(""); }
  }
  return <div className="survey-rich-options"><span className="survey-field-title">Opções selecionáveis</span>{items.map((item, index) => {
    const option = typeof item === "string" ? { value: item, text: item } : item;
    return <fieldset className="survey-rich-option" key={option.value}><legend>Opção {index + 1}</legend><label>Texto da opção<input maxLength={180} value={option.text ?? ""} onChange={(event) => update(index, { ...option, text: event.target.value || undefined })} placeholder="Opcional quando houver mídia" /></label><label>Anexar imagem ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busyOption === String(index)} onChange={(event) => { void upload(index, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>{busyOption === String(index) && <small>Enviando mídia…</small>}{option.media && <div className="survey-rich-option-preview">{option.media.type === "video" ? <video src={option.media.url} controls playsInline /> : <img src={option.media.url} alt={option.media.altText || option.text || `Prévia da opção ${index + 1}`} />}<label>Texto alternativo da mídia<input maxLength={240} value={option.media.altText} onChange={(event) => update(index, { ...option, media: { ...option.media!, altText: event.target.value } })} /></label><button className="button ghost" type="button" onClick={() => update(index, { ...option, media: undefined })}>Remover mídia</button></div>}<p className="survey-reference">O cliente pode selecionar {option.text && option.media ? "o texto e a mídia" : option.media ? "a mídia" : "o texto"} desta opção.</p><div className="survey-question-actions"><button className="button ghost" type="button" disabled={items.length <= 1} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remover opção</button></div></fieldset>;
  })}{error && <p className="error" role="alert">{error}</p>}<button className="button ghost" type="button" disabled={items.length >= 100} onClick={() => onChange([...items, { value: crypto.randomUUID() }])}>＋ Adicionar opção</button></div>;
}

function MultiSelect({ label, values, options, onChange }: { label: string; values: string[]; options: Array<{ id: string; label: string }>; onChange: (values: string[]) => void }) {
  return <label>{label}<select multiple size={Math.min(5, Math.max(3, options.length))} value={values} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><small>Use Ctrl ou Command para selecionar mais de uma opção.</small></label>;
}

function ItemListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() { const value = draft.trim(); if (!value || items.includes(value) || items.length >= 100) return; onChange([...items, value]); setDraft(""); }
  return <div className="survey-list-editor"><span className="survey-field-title">{label}</span><div className="survey-item-chips">{items.map((item, index) => <span className="survey-item-chip" key={`${item}-${index}`}>{item}<button type="button" aria-label={`Remover ${item}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}</div><div className="survey-item-add"><input value={draft} maxLength={180} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /><button type="button" className="button ghost" disabled={!draft.trim()} onClick={add}>Adicionar resposta</button></div></div>;
}

function ByteLimit({ value, onChange }: { value: number; onChange: (bytes: number) => void }) {
  const [unitSize, setUnitSize] = useState<number>(1024 ** 2);
  const unit = mediaUnits.find((item) => item.size === unitSize) ?? mediaUnits[2]!;
  const inputValue = value ? Number((value / unit.size).toFixed(unit.size >= 1024 ** 2 ? 3 : 1)) : Number((5 * 1024 ** 2 / unit.size).toFixed(unit.size >= 1024 ** 2 ? 3 : 1));
  return <div className="survey-byte-limit"><label>Tamanho máximo<input type="number" min="0.001" max={SAFE_MEDIA_BYTES / unit.size} step={unit.size >= 1024 ** 2 ? "0.001" : "1"} value={inputValue} onChange={(event) => onChange(Math.min(SAFE_MEDIA_BYTES, Math.max(1, Math.round(Number(event.target.value) * unit.size))))} /></label><label>Unidade<select value={unitSize} onChange={(event) => setUnitSize(Number(event.target.value))}>{mediaUnits.map((item) => <option key={item.name} value={item.size}>{item.name}</option>)}</select></label><small>Limite de segurança: 10 MB no máximo.</small></div>;
}

function QuestionSettings({ question, update }: { question: SurveyQuestion; update: (patch: Partial<SurveyQuestion>) => void }) {
  const [mime, setMime] = useState(question.media?.mimeTypes ?? ["image/jpeg", "image/png", "image/webp"]);
  useEffect(() => { setMime(question.media?.mimeTypes ?? ["image/jpeg", "image/png", "image/webp"]); }, [question.id]);
  const isRichChoice = ["single_choice", "multiple_choice"].includes(question.type);
  const isChoice = ["checkboxes", "dropdown", "choice_text"].includes(question.type);
  const hasTextMediaToggle = question.type === "free_text";
  const supportsMedia = question.type === "media" || hasTextMediaToggle;
  function setMimeTypes(values: string[]) { setMime(values); if (values.length && question.media) update({ media: { ...question.media, mimeTypes: values } }); else if (values.length && question.type === "media") update({ media: { mimeTypes: values, maxBytes: 5 * 1024 * 1024 } }); else if (question.media) update({ media: undefined }); }
  return <div className="survey-question-settings">
    {isRichChoice && <RichOptionEditor items={question.options} onChange={(options) => update({ options })} />}
    {isChoice && <ItemListEditor label="Opções de resposta" items={question.options.map((option, index) => surveyOptionLabel(option, index))} onChange={(options) => update({ options })} placeholder="Digite uma opção" />}
    {["multiple_choice_grid", "checkbox_grid"].includes(question.type) && <div className="survey-grid-builder"><ItemListEditor label="Linhas da grade" items={question.rows} onChange={(rows) => update({ rows })} placeholder="Nome da linha" /><ItemListEditor label="Colunas da grade" items={question.columns} onChange={(columns) => update({ columns })} placeholder="Nome da coluna" />{question.rows.length > 0 && question.columns.length > 0 && <div className="survey-grid-preview" role="img" aria-label={`Prévia da grade com ${question.rows.length} linhas e ${question.columns.length} colunas`}><div className="survey-grid-preview-head" style={{ gridTemplateColumns: `minmax(110px,1.4fr) repeat(${question.columns.length}, minmax(70px,1fr))` }}><span></span>{question.columns.map((column, index) => <span key={`${column}-${index}`}>{column}</span>)}</div>{question.rows.map((row, rowIndex) => <div className="survey-grid-preview-row" key={`${row}-${rowIndex}`} style={{ gridTemplateColumns: `minmax(110px,1.4fr) repeat(${question.columns.length}, minmax(70px,1fr))` }}><strong>{row}</strong>{question.columns.map((column, columnIndex) => <span key={`${column}-${columnIndex}`}>{question.type === "checkbox_grid" ? "□" : "○"}</span>)}</div>)}</div>}</div>}
    {question.type === "linear_scale" && <div className="survey-builder-settings"><label>Mínimo<input type="number" min="0" max="99" value={question.scale?.min ?? 1} onChange={(event) => update({ scale: { min: Number(event.target.value), max: question.scale?.max ?? 5 } })} /></label><label>Máximo<input type="number" min="1" max="100" value={question.scale?.max ?? 5} onChange={(event) => update({ scale: { min: question.scale?.min ?? 1, max: Number(event.target.value) } })} /></label></div>}
    {hasTextMediaToggle && <label className="check"><input type="checkbox" checked={Boolean(question.media)} onChange={(event) => update({ media: event.target.checked ? { mimeTypes: mime, maxBytes: 5 * 1024 * 1024 } : undefined })} /><span>Permitir anexar mídia a esta resposta</span></label>}
    {supportsMedia && (question.type === "media" || Boolean(question.media)) && <div className="survey-media-config"><label>Tipos de arquivo aceitos<select multiple size={4} value={question.media?.mimeTypes ?? mime} onChange={(event) => setMimeTypes(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{mediaTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><ByteLimit value={question.media?.maxBytes ?? 5 * 1024 * 1024} onChange={(maxBytes) => update({ media: { mimeTypes: question.media?.mimeTypes ?? mime, maxBytes } })} /></div>}
    {question.type === "choice_text" && <label className="check"><input type="checkbox" checked={Boolean(question.textAfterChoice)} onChange={(event) => update({ textAfterChoice: event.target.checked })} /><span>Incluir campo de texto depois da seleção</span></label>}
    {question.type === "binary_swipe" && <div className="survey-builder-settings"><label>Ação ao arrastar para a direita<input maxLength={80} value={question.positiveLabel ?? ""} placeholder="Ex.: Gostei" onChange={(event) => update({ positiveLabel: event.target.value })} /></label><label>Ação ao arrastar para a esquerda<input maxLength={80} value={question.negativeLabel ?? ""} placeholder="Ex.: Não gostei" onChange={(event) => update({ negativeLabel: event.target.value })} /></label><label>Tipo da mídia do cartão<select value={question.cardMedia?.type ?? "image"} onChange={(event) => update({ cardMedia: { url: question.cardMedia?.url ?? "", type: event.target.value as "image" | "video", altText: question.cardMedia?.altText ?? "" } })}><option value="image">Imagem</option><option value="video">Vídeo</option></select></label><label>Mídia do cartão (URL HTTPS)<input type="url" placeholder="https://…" value={question.cardMedia?.url ?? ""} onChange={(event) => update({ cardMedia: event.target.value ? { url: event.target.value, type: question.cardMedia?.type ?? "image", altText: question.cardMedia?.altText ?? "" } : undefined })} /></label>{question.cardMedia?.url && <label>Descrição acessível da mídia<input maxLength={240} value={question.cardMedia.altText} onChange={(event) => update({ cardMedia: { ...question.cardMedia!, altText: event.target.value } })} /></label>}</div>}
    <div className="survey-builder-settings"><label>Tamanho da fonte<select value={question.style.fontSize} onChange={(event) => update({ style: { ...question.style, fontSize: event.target.value as SurveyQuestion["style"]["fontSize"] } })}><option value="sm">Pequeno</option><option value="md">Médio</option><option value="lg">Grande</option><option value="xl">Extra grande</option></select></label><label className="check"><input type="checkbox" checked={question.style.bold} onChange={(event) => update({ style: { ...question.style, bold: event.target.checked } })} /><span>Negrito</span></label><label className="check"><input type="checkbox" checked={question.style.italic} onChange={(event) => update({ style: { ...question.style, italic: event.target.checked } })} /><span>Itálico</span></label><label className="check"><input type="checkbox" checked={question.style.markdown} onChange={(event) => update({ style: { ...question.style, markdown: event.target.checked } })} /><span>Markdown</span></label><label>HTML seguro<textarea value={question.style.html ?? ""} onChange={(event) => update({ style: { ...question.style, html: event.target.value } })} /></label></div>
  </div>;
}

export function AdminSurveysPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [draft, setDraft] = useState<SurveyDefinition>(newDefinition);
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [importText, setImportText] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<Set<string>>(() => new Set());
  const [previewSurveyId, setPreviewSurveyId] = useState("");
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const selectionTimers = useRef(new Map<string, number>());
  const builderRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => { for (const timer of selectionTimers.current.values()) window.clearTimeout(timer); }, []);

  function toggleSurveySelection(id: string) {
    setSelectedSurveyIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function selectSurveyOnSingleClick(id: string, clickCount: number) {
    if (clickCount !== 1) return;
    const existing = selectionTimers.current.get(id);
    if (existing) window.clearTimeout(existing);
    selectionTimers.current.set(id, window.setTimeout(() => { toggleSurveySelection(id); selectionTimers.current.delete(id); }, 240));
  }

  function openSurveyPreview(id: string) {
    const timer = selectionTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    selectionTimers.current.delete(id);
    setPreviewSurveyId(id);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const current = await getLilySession();
        if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
        const surveyData = await surveyJson<{ surveys: SurveyRow[] }>("admin/surveys");
        if (active) { setSession(current); setRows(surveyData.surveys); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar pesquisas."); }
      finally { if (active) setInitialLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!previewSurveyId) { setAnalytics(null); setAnalyticsError(""); return; }
    let active = true;
    setAnalyticsLoading(true);
    surveyJson<SurveyAnalytics>(`admin/surveys/${encodeURIComponent(previewSurveyId)}/analytics`)
      .then((result) => { if (active) setAnalytics(result); })
      .catch((cause) => { if (active) setAnalyticsError(cause instanceof Error ? cause.message : "Não foi possível carregar as estatísticas."); })
      .finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [previewSurveyId]);

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setDraft((old) => {
      const questions = old.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question);
      const changed = questions[index]!;
      const choiceTypes = ["single_choice", "multiple_choice", "checkboxes", "dropdown", "choice_text", "binary_swipe"];
      return { ...old, questions: questions.map((question) => {
        const condition = question.visibility;
        if (!condition || condition.questionId !== changed.id || !["equals", "contains"].includes(condition.operator)) return question;
        const values = changed.type === "binary_swipe" ? ["positive", "negative"] : changed.options.map(surveyOptionValue);
        const multiple = ["multiple_choice", "checkboxes"].includes(changed.type);
        const valid = choiceTypes.includes(changed.type) && Boolean(condition.value && values.includes(condition.value)) && (condition.operator === "contains" ? multiple : !multiple);
        if (valid) return question;
        return { ...question, visibility: choiceTypes.includes(changed.type) && values.length ? { ...condition, operator: multiple ? "contains" : "equals", value: values[0] } : { questionId: condition.questionId, operator: "answered" as const } };
      }) };
    });
  }

  function editSurvey(row: SurveyRow) {
    if (!row.definition || !["draft", "paused"].includes(row.status ?? "")) return;
    setDraft(row.definition);
    setEditing(row.id);
    setPreviewQuestion(0);
    requestAnimationFrame(() => builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function setSurveyLifecycle(id: string, action: "pause" | "resume") {
    if (!session) return;
    setError(""); setStatus("");
    try {
      const result = await surveyJson<{ survey: { status: string } }>(`admin/surveys/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { "X-Lily-CSRF": session.csrfToken }, body: "{}" });
      setRows((current) => current.map((row) => row.id === id ? { ...row, status: result.survey.status } : row));
      setStatus(action === "pause" ? "Pesquisa pausada. Quem já começou pode concluir; novas respostas estão suspensas." : "Pesquisa retomada e disponível para novas respostas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar o status da pesquisa."); }
  }

  async function deleteSurvey(row: SurveyRow) {
    if (!session || !window.confirm(`Excluir “${row.title}”? Ela deixará de receber respostas, e o histórico de respostas e estatísticas será preservado.`)) return;
    setError(""); setStatus("");
    try {
      const result = await surveyJson<{ survey: { status: string } }>(`admin/surveys/${encodeURIComponent(row.id)}`, { method: "DELETE", headers: { "X-Lily-CSRF": session.csrfToken } });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: result.survey.status } : item));
      setSelectedSurveyIds((current) => { const next = new Set(current); next.delete(row.id); return next; });
      if (editing === row.id) { setEditing(""); setDraft(newDefinition()); }
      setStatus("Pesquisa excluída da área de respostas. Histórico e resultados foram preservados.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir a pesquisa."); }
  }

  function importDefinition() {
    try {
      const parsed = JSON.parse(importText) as SurveyDefinition | { definition: SurveyDefinition };
      const definition = "definition" in parsed ? parsed.definition : parsed;
      setDraft(addGeneratedQuestionIds(definition));
      setStatus("Formulário JSON importado. Identificadores internos foram gerados automaticamente.");
      setError("");
      return;
    } catch { /* HTML import follows. */ }
    try {
      const document = new DOMParser().parseFromString(importText, "text/html");
      const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"));
      const questions = controls.map((control, index): SurveyQuestion => {
        const title = control.closest("label")?.innerText?.trim() || control.getAttribute("aria-label") || control.getAttribute("placeholder") || `Pergunta ${index + 1}`;
        const base = newQuestion(control instanceof HTMLSelectElement ? control.multiple ? "multiple_choice" : "dropdown" : control instanceof HTMLTextAreaElement ? "paragraph" : "short_answer");
        const options = control instanceof HTMLSelectElement ? Array.from(control.options).map((option) => option.text.trim()).filter((text) => text && !["Selecione", "Selecione uma opção"].includes(text)) : control instanceof HTMLInputElement && control.type === "checkbox" ? [control.value || "Sim"] : [];
        return { ...base, title, required: control.required, options };
      });
      if (!questions.length) throw new Error("HTML sem input, select ou textarea.");
      setDraft((old) => ({ ...old, title: document.querySelector("h1")?.textContent?.trim() || old.title, questions }));
      setStatus("HTML convertido em perguntas editáveis. Revise a prévia antes de salvar.");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível importar HTML ou JSON."); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const path = editing ? `admin/surveys/${encodeURIComponent(editing)}` : "admin/surveys";
      const result = await surveyJson<{ survey: { id: string; version: number; status: string; updatedAt: string; createdAt: string } }>(path, { method: editing ? "PUT" : "POST", headers: { "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify(definitionForSave(draft)) });
      const previous = rows.find((item) => item.id === result.survey.id);
      const row: SurveyRow = { id: result.survey.id, title: draft.title, subtitle: draft.subtitle || null, description: draft.description || null, estimatedMinutes: draft.estimatedMinutes, questionCount: draft.questions.length, points: draft.showPoints ? draft.pointsPerForm + draft.pointsPerAnswer * draft.questions.length : null, showPoints: draft.showPoints, definition: draft, status: result.survey.status, version: result.survey.version, createdAt: previous?.createdAt ?? result.survey.createdAt, viewCount: previous?.viewCount ?? 0, responseCount: previous?.responseCount ?? 0 };
      setEditing(row.id);
      setRows((current) => current.some((item) => item.id === row.id) ? current.map((item) => item.id === row.id ? row : item) : [row, ...current]);
      setStatus(previous?.status === "paused" ? "Alterações salvas. A pesquisa continua pausada até você retomá-la." : "Rascunho salvo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao salvar pesquisa."); }
    finally { setBusy(false); }
  }

  async function publish(id: string) {
    if (!session) return;
    try {
      await surveyJson(`admin/surveys/${encodeURIComponent(id)}/publish`, { method: "POST", headers: { "X-Lily-CSRF": session.csrfToken }, body: "{}" });
      setRows((current) => current.map((row) => row.id === id ? { ...row, status: "published" } : row));
      setStatus("Pesquisa publicada. A notificação foi enviada às contas CookLily ativas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao publicar."); }
  }

  if (!session && initialLoading) return <section className="survey-state"><LilyLoadingSpinner size="lg" label="Carregando painel de pesquisas" /></section>;
  if (!session) return <section className="survey-state"><span className="eyebrow">Painel CookLily</span><h1>Não foi possível abrir as pesquisas.</h1><p className="error" role="alert">{error || "Sua sessão não está disponível. Entre novamente e tente outra vez."}</p><Link className="button primary" to={`/entrar?next=${encodeURIComponent(window.location.pathname)}`}>Entrar como staff</Link></section>;
  const pointsEstimate = draft.pointsPerForm + draft.pointsPerAnswer * draft.questions.length;
  return <section className="survey-admin">
    <div className="admin-heading"><div><span className="eyebrow">Painel CookLily</span><h1>Montar pesquisas</h1><p>Edite e visualize o formulário sem recarregar o painel.</p></div><Link className="button ghost" to="/painel">Painel</Link></div>
    {error && <p className="error" role="alert">{error}</p>}{status && <p className="success" role="status">{status}</p>}
    <div className="survey-admin-list" aria-label="Pesquisas cadastradas">{rows.map((row) => <div className="survey-admin-card-wrap" key={row.id}><button type="button" className={`survey-admin-card ${selectedSurveyIds.has(row.id) ? "is-selected" : ""}`} aria-pressed={selectedSurveyIds.has(row.id)} aria-label={`${selectedSurveyIds.has(row.id) ? "Desselecionar" : "Selecionar"} pesquisa ${row.title}. Clique duas vezes para visualizar.`} onClick={(event) => selectSurveyOnSingleClick(row.id, event.detail)} onDoubleClick={() => openSurveyPreview(row.id)}><span className="survey-card-id" title={row.id}>{row.id.slice(0, 8)}</span><span className={`survey-status-dot is-${row.status ?? "draft"}`} role="img" aria-label={`Status: ${row.status ?? "rascunho"}`} title={row.status ?? "rascunho"} /><strong>{row.title}</strong><span className="survey-card-metrics"><span aria-label={`${row.viewCount} visualizações`}><SurveyEyeIcon />{row.viewCount}</span><span aria-label={`${row.responseCount} respostas`}><SurveyReplyIcon />{row.responseCount}</span></span><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time></button><div className="survey-card-actions"><button className="button ghost" type="button" disabled={!row.definition || !["draft", "paused"].includes(row.status ?? "")} title={row.status === "published" ? "Pause a pesquisa para editar" : undefined} onClick={() => editSurvey(row)}>{row.status === "published" ? "Pause para editar" : "Editar"}</button><Link className="button ghost" to={`/painel/pesquisas/${encodeURIComponent(row.id)}/respostas`}>Resultados</Link>{row.status === "published" && <button className="button ghost" type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}pesquisas/${encodeURIComponent(row.id)}`)}>Copiar link público</button>}{row.status === "draft" && <button className="button primary" type="button" onClick={() => void publish(row.id)}>Publicar</button>}{row.status === "published" && <button className="button ghost" type="button" onClick={() => void setSurveyLifecycle(row.id, "pause")}>Pausar</button>}{row.status === "paused" && <><button className="button primary" type="button" onClick={() => void setSurveyLifecycle(row.id, "resume")}>Retomar</button><span className="survey-edit-hint">Pause a pesquisa e aguarde as respostas em andamento antes de editar.</span></>}{row.status !== "cancelled" && <button className="button ghost" type="button" onClick={() => void deleteSurvey(row)}>Excluir</button>}</div></div>)}</div>
    {previewSurveyId && <SurveyPreviewDialog survey={rows.find((row) => row.id === previewSurveyId) ?? null} analytics={analytics} loading={analyticsLoading} error={analyticsError} onClose={() => setPreviewSurveyId("")} />}
    <form ref={builderRef} className="survey-builder" onSubmit={(event) => void save(event)}>
      <h2>{editing ? "Editar pesquisa" : "Nova pesquisa"}</h2>{editing && <><p className="survey-reference">Referência da pesquisa: <code>{editing}</code></p><button className="button ghost" type="button" onClick={() => { setEditing(""); setDraft(newDefinition()); setStatus(""); setError(""); }}>Cancelar edição</button>{rows.find((row) => row.id === editing)?.status === "paused" && <p className="survey-reference">A pesquisa permanecerá pausada após salvar. As versões anteriores e suas respostas serão mantidas.</p>}</>}
      <label>Título *<input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Subtítulo<input maxLength={240} value={draft.subtitle ?? ""} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
      <label>Descrição<textarea rows={3} maxLength={4000} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <div className="survey-builder-settings"><label>Tempo estimado (minutos)<input type="number" min="1" max="180" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: Number(event.target.value) })} /></label><label>Pontos ao concluir<input type="number" min="0" max="100000" value={draft.pointsPerForm} onChange={(event) => setDraft({ ...draft, pointsPerForm: Number(event.target.value) })} /></label><label>Pontos por resposta<input type="number" min="0" max="100000" value={draft.pointsPerAnswer} onChange={(event) => setDraft({ ...draft, pointsPerAnswer: Number(event.target.value) })} /></label><label className="check"><input type="checkbox" checked={draft.showPoints} onChange={(event) => setDraft({ ...draft, showPoints: event.target.checked })} /><span>Mostrar recompensa ao cliente</span></label><label className="check"><input type="checkbox" checked={draft.allowNavigation} onChange={(event) => setDraft({ ...draft, allowNavigation: event.target.checked })} /><span>Permitir navegar e revisar respostas</span></label><div className="survey-estimate-preview"><strong>{draft.estimatedMinutes} min</strong><span>Tempo estimado</span>{draft.showPoints && <><strong>{pointsEstimate.toLocaleString("pt-BR")} pontos</strong><span>Recompensa máxima estimada</span></>}</div></div>
      <MultiSelect label="Pesquisas que precisam ser concluídas" values={draft.prerequisites} options={rows.map((row) => ({ id: row.id, label: `${row.title} · ${row.id.slice(0, 8)}` }))} onChange={(prerequisites) => setDraft({ ...draft, prerequisites })} />
      <div className="survey-builder-questions">{draft.questions.map((question, index) => {
        const set = (patch: Partial<SurveyQuestion>) => updateQuestion(index, patch);
        return <fieldset className="survey-builder-question" key={question.id}><legend>Pergunta {index + 1}</legend><p className="survey-reference">Referência técnica: <code>{question.id}</code></p><label>Tipo<select value={question.type} onChange={(event) => set({ type: event.target.value, media: event.target.value === "media" ? { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 } : undefined })}>{Object.entries(questionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Pergunta *<input required maxLength={240} value={question.title} onChange={(event) => set({ title: event.target.value })} /></label><label>Descrição opcional<textarea maxLength={4000} value={question.description} onChange={(event) => set({ description: event.target.value })} /></label><label className="check"><input type="checkbox" checked={question.required} onChange={(event) => set({ required: event.target.checked })} /><span>Resposta obrigatória</span></label><QuestionVisibilityRule question={question} previousQuestions={draft.questions.slice(0, index)} update={set} /><QuestionSettings question={question} update={set} /><div className="survey-question-actions"><button className="button ghost" type="button" disabled={draft.questions.length <= 1} onClick={() => setDraft((old) => { const removedId = old.questions[index]?.id; return { ...old, questions: old.questions.filter((_, questionIndex) => questionIndex !== index).map((item) => item.visibility?.questionId === removedId ? { ...item, visibility: undefined } : item) }; })}>Remover pergunta</button></div></fieldset>;
      })}</div>
      <button className="button ghost" type="button" onClick={() => setDraft((old) => ({ ...old, questions: [...old.questions, newQuestion()] }))}>＋ Adicionar pergunta</button>
      <div className="survey-live-preview"><div className="survey-preview-heading"><div><span className="eyebrow">Prévia ao vivo</span><h3>{draft.title || "Título da pesquisa"}</h3></div><label>Pré-visualizar pergunta<select value={previewQuestion} onChange={(event) => setPreviewQuestion(Number(event.target.value))}>{draft.questions.map((question, index) => <option key={question.id} value={index}>Pergunta {index + 1}</option>)}</select></label></div>{draft.questions[previewQuestion] && <fieldset className={`survey-question font-${draft.questions[previewQuestion]!.style.fontSize} ${draft.questions[previewQuestion]!.style.bold ? "is-bold" : ""} ${draft.questions[previewQuestion]!.style.italic ? "is-italic" : ""}`}><legend>{draft.questions[previewQuestion]!.title || "Sua pergunta aparecerá aqui"}{draft.questions[previewQuestion]!.required && <span> *</span>}</legend>{draft.questions[previewQuestion]!.description && <p>{draft.questions[previewQuestion]!.description}</p>}<QuestionInput question={draft.questions[previewQuestion]!} value={undefined} onChange={() => undefined} surveyId="preview" disabled /></fieldset>}</div>
      <div className="survey-builder-import"><label>Importar formulário em HTML ou JSON<textarea value={importText} onChange={(event) => setImportText(event.target.value)} /></label><button className="button ghost" type="button" onClick={importDefinition}>Importar HTML ou JSON</button></div>
      <button className="button primary" disabled={busy}>{busy ? "Salvando rascunho…" : "Salvar rascunho"}</button>
    </form>
  </section>;
}

function SurveyPreviewDialog({ survey, analytics, loading, error, onClose }: { survey: SurveyRow | null; analytics: SurveyAnalytics | null; loading: boolean; error: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  if (!survey?.definition) return null;
  return <dialog ref={dialogRef} className="survey-preview-dialog" aria-labelledby="survey-preview-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <header><div><span className="eyebrow">Prévia da pesquisa</span><h2 id="survey-preview-title">{survey.title}</h2></div><button type="button" className="button ghost" onClick={onClose} autoFocus>Fechar</button></header>
    <SurveyAnalyticsPanel definition={survey.definition} analytics={analytics} loading={loading} error={error} />
  </dialog>;
}

function SurveyEyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
}

function SurveyReplyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-2" /></svg>;
}
