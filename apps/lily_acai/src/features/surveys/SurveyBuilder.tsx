import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";
import { QuestionInput } from "./QuestionInput";
import { surveyJson, type SurveyDefinition, type SurveyQuestion } from "./api";

type SurveyRow = { id: string; title: string; subtitle: string | null; description: string | null; estimatedMinutes: number; questionCount?: number; points: number | null; showPoints?: boolean; definition?: SurveyDefinition; status?: string; version?: number };
type MissionRow = { id: string; title: string; description?: string | null; points: number };
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
  return { ...definition, questions: definition.questions.map((question) => ({ ...question, id: crypto.randomUUID() })) };
}

function MultiSelect({ label, values, options, onChange }: { label: string; values: string[]; options: Array<{ id: string; label: string }>; onChange: (values: string[]) => void }) {
  return <label>{label}<select multiple size={Math.min(5, Math.max(3, options.length))} value={values} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><small>Use Ctrl ou Command para selecionar mais de uma opção.</small></label>;
}

function ItemListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add(event: FormEvent) { event.preventDefault(); const value = draft.trim(); if (!value || items.includes(value) || items.length >= 100) return; onChange([...items, value]); setDraft(""); }
  return <div className="survey-list-editor"><span className="survey-field-title">{label}</span><div className="survey-item-chips">{items.map((item, index) => <span className="survey-item-chip" key={`${item}-${index}`}>{item}<button type="button" aria-label={`Remover ${item}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}</div><form className="survey-item-add" onSubmit={add}><input value={draft} maxLength={180} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} /><button type="submit" className="button ghost" disabled={!draft.trim()}>Adicionar</button></form></div>;
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
  const isChoice = ["single_choice", "multiple_choice", "checkboxes", "dropdown", "choice_text"].includes(question.type);
  const hasTextMediaToggle = question.type === "free_text";
  const supportsMedia = question.type === "media" || hasTextMediaToggle;
  function setMimeTypes(values: string[]) { setMime(values); if (values.length && question.media) update({ media: { ...question.media, mimeTypes: values } }); else if (values.length && question.type === "media") update({ media: { mimeTypes: values, maxBytes: 5 * 1024 * 1024 } }); else if (question.media) update({ media: undefined }); }
  return <div className="survey-question-settings">
    {isChoice && <ItemListEditor label="Opções de resposta" items={question.options} onChange={(options) => update({ options })} placeholder="Digite uma opção" />}
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
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [missionPrerequisites, setMissionPrerequisites] = useState<string[]>([]);
  const [draft, setDraft] = useState<SurveyDefinition>(newDefinition);
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [importText, setImportText] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const missionFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const current = await getLilySession();
        if (!["staff", "admin"].includes(current.user.role)) throw new Error("Acesso staff necessário.");
        const [surveyData, missionData] = await Promise.all([
          surveyJson<{ surveys: SurveyRow[] }>("admin/surveys"),
          current.user.role === "admin" ? surveyJson<{ missions: MissionRow[] }>("admin/missions") : Promise.resolve({ missions: [] })
        ]);
        if (active) { setSession(current); setRows(surveyData.surveys); setMissions(missionData.missions); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar pesquisas."); }
      finally { if (active) setInitialLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setDraft((old) => ({ ...old, questions: old.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question) }));
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
      const result = await surveyJson<{ survey: { id: string; version: number; status: string; updatedAt: string } }>(path, { method: editing ? "PUT" : "POST", headers: { "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify(definitionForSave(draft)) });
      const row: SurveyRow = { id: result.survey.id, title: draft.title, subtitle: draft.subtitle || null, description: draft.description || null, estimatedMinutes: draft.estimatedMinutes, questionCount: draft.questions.length, points: draft.showPoints ? draft.pointsPerForm + draft.pointsPerAnswer * draft.questions.length : null, showPoints: draft.showPoints, definition: draft, status: result.survey.status, version: result.survey.version };
      setEditing(row.id);
      setRows((current) => current.some((item) => item.id === row.id) ? current.map((item) => item.id === row.id ? row : item) : [row, ...current]);
      setStatus("Rascunho salvo.");
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

  async function createMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await surveyJson<{ mission: MissionRow }>("admin/missions", { method: "POST", headers: { "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify({ title: String(data.get("title")), description: String(data.get("description") || "") || null, points: Number(data.get("points") || 0), prerequisites: missionPrerequisites }) });
      setMissions((current) => [result.mission, ...current]);
      setMissionPrerequisites([]);
      form.reset();
      setStatus(`Missão criada. Referência: ${result.mission.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar missão."); }
  }

  if (!session && initialLoading) return <section className="survey-state"><LilyLoadingSpinner size="lg" label="Carregando painel de pesquisas" /></section>;
  if (!session) return <section className="survey-state"><span className="eyebrow">Painel CookLily</span><h1>Não foi possível abrir as pesquisas.</h1><p className="error" role="alert">{error || "Sua sessão não está disponível. Entre novamente e tente outra vez."}</p><Link className="button primary" to={`/entrar?next=${encodeURIComponent(window.location.pathname)}`}>Entrar como staff</Link></section>;
  const surveyOptions = rows.map((row) => ({ id: row.id, label: `${row.title} · ${row.id.slice(0, 8)}` }));
  const pointsEstimate = draft.pointsPerForm + draft.pointsPerAnswer * draft.questions.length;
  return <section className="survey-admin">
    <div className="admin-heading"><div><span className="eyebrow">Painel CookLily</span><h1>Montar pesquisas</h1><p>Edite e visualize o formulário sem recarregar o painel.</p></div><Link className="button ghost" to="/painel">Painel</Link></div>
    {error && <p className="error" role="alert">{error}</p>}{status && <p className="success" role="status">{status}</p>}
    <div className="survey-admin-list">{rows.map((row) => <article key={row.id}><div><strong>{row.title}</strong><span>{row.status} · versão {row.version} · ref. {row.id}</span></div><div className="survey-actions"><button className="button ghost" type="button" disabled={!row.definition || row.status !== "draft"} onClick={() => { if (row.definition) { setDraft(row.definition); setEditing(row.id); setPreviewQuestion(0); } }}>Editar rascunho</button><Link className="button ghost" to={`/painel/pesquisas/${encodeURIComponent(row.id)}/respostas`}>Ver respostas</Link>{row.status === "draft" && <button className="button primary" type="button" onClick={() => void publish(row.id)}>Publicar</button>}</div></article>)}</div>
    {session.user.role === "admin" && <form className="survey-builder" ref={missionFormRef} onSubmit={(event) => void createMission(event)}><h2>Criar missão</h2><div className="survey-builder-settings"><label>Título<input name="title" required maxLength={180} /></label><label>Descrição<input name="description" maxLength={2000} /></label><label>Pontos<input name="points" type="number" min="0" max="100000" defaultValue="0" /></label><MultiSelect label="Pesquisas necessárias" values={missionPrerequisites} options={surveyOptions} onChange={setMissionPrerequisites} /></div><button className="button primary">Criar missão</button>{missions.length > 0 && <ul className="survey-reference-list">{missions.map((mission) => <li key={mission.id}>{mission.title} · {mission.points} pontos <code>ref. {mission.id}</code></li>)}</ul>}</form>}
    <form className="survey-builder" onSubmit={(event) => void save(event)}>
      <h2>{editing ? "Editar pesquisa" : "Nova pesquisa"}</h2>{editing && <p className="survey-reference">Referência da pesquisa: <code>{editing}</code></p>}
      <label>Título *<input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Subtítulo<input maxLength={240} value={draft.subtitle ?? ""} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
      <label>Descrição<textarea rows={3} maxLength={4000} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <div className="survey-builder-settings"><label>Tempo estimado (minutos)<input type="number" min="1" max="180" value={draft.estimatedMinutes} onChange={(event) => setDraft({ ...draft, estimatedMinutes: Number(event.target.value) })} /></label><label>Pontos ao concluir<input type="number" min="0" max="100000" value={draft.pointsPerForm} onChange={(event) => setDraft({ ...draft, pointsPerForm: Number(event.target.value) })} /></label><label>Pontos por resposta<input type="number" min="0" max="100000" value={draft.pointsPerAnswer} onChange={(event) => setDraft({ ...draft, pointsPerAnswer: Number(event.target.value) })} /></label><label className="check"><input type="checkbox" checked={draft.showPoints} onChange={(event) => setDraft({ ...draft, showPoints: event.target.checked })} /><span>Mostrar recompensa ao cliente</span></label><label className="check"><input type="checkbox" checked={draft.allowNavigation} onChange={(event) => setDraft({ ...draft, allowNavigation: event.target.checked })} /><span>Permitir navegar e revisar respostas</span></label><div className="survey-estimate-preview"><strong>{draft.estimatedMinutes} min</strong><span>Tempo estimado</span>{draft.showPoints && <><strong>{pointsEstimate.toLocaleString("pt-BR")} pontos</strong><span>Recompensa máxima estimada</span></>}</div></div>
      <MultiSelect label="Pesquisas que precisam ser concluídas" values={draft.prerequisites} options={surveyOptions} onChange={(prerequisites) => setDraft({ ...draft, prerequisites })} />
      <MultiSelect label="Missões liberadas ao concluir" values={draft.unlocksMissions} options={missions.map((mission) => ({ id: mission.id, label: `${mission.title} · ${mission.id.slice(0, 8)}` }))} onChange={(unlocksMissions) => setDraft({ ...draft, unlocksMissions })} />
      <div className="survey-builder-questions">{draft.questions.map((question, index) => {
        const set = (patch: Partial<SurveyQuestion>) => updateQuestion(index, patch);
        return <fieldset className="survey-builder-question" key={question.id}><legend>Pergunta {index + 1}</legend><p className="survey-reference">Referência técnica: <code>{question.id}</code></p><label>Tipo<select value={question.type} onChange={(event) => set({ type: event.target.value, media: event.target.value === "media" ? { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 } : undefined })}>{Object.entries(questionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Pergunta *<input required maxLength={240} value={question.title} onChange={(event) => set({ title: event.target.value })} /></label><label>Descrição opcional<textarea maxLength={4000} value={question.description} onChange={(event) => set({ description: event.target.value })} /></label><label className="check"><input type="checkbox" checked={question.required} onChange={(event) => set({ required: event.target.checked })} /><span>Resposta obrigatória</span></label><QuestionSettings question={question} update={set} /><div className="survey-question-actions"><button className="button ghost" type="button" disabled={draft.questions.length <= 1} onClick={() => setDraft((old) => ({ ...old, questions: old.questions.filter((_, questionIndex) => questionIndex !== index) }))}>Remover pergunta</button></div></fieldset>;
      })}</div>
      <button className="button ghost" type="button" onClick={() => setDraft((old) => ({ ...old, questions: [...old.questions, newQuestion()] }))}>＋ Adicionar pergunta</button>
      <div className="survey-live-preview"><div className="survey-preview-heading"><div><span className="eyebrow">Prévia ao vivo</span><h3>{draft.title || "Título da pesquisa"}</h3></div><label>Pré-visualizar pergunta<select value={previewQuestion} onChange={(event) => setPreviewQuestion(Number(event.target.value))}>{draft.questions.map((question, index) => <option key={question.id} value={index}>Pergunta {index + 1}</option>)}</select></label></div>{draft.questions[previewQuestion] && <fieldset className={`survey-question font-${draft.questions[previewQuestion]!.style.fontSize} ${draft.questions[previewQuestion]!.style.bold ? "is-bold" : ""} ${draft.questions[previewQuestion]!.style.italic ? "is-italic" : ""}`}><legend>{draft.questions[previewQuestion]!.title || "Sua pergunta aparecerá aqui"}{draft.questions[previewQuestion]!.required && <span> *</span>}</legend>{draft.questions[previewQuestion]!.description && <p>{draft.questions[previewQuestion]!.description}</p>}<QuestionInput question={draft.questions[previewQuestion]!} value={undefined} onChange={() => undefined} surveyId="preview" disabled /></fieldset>}</div>
      <div className="survey-builder-import"><label>Importar formulário em HTML ou JSON<textarea value={importText} onChange={(event) => setImportText(event.target.value)} /></label><button className="button ghost" type="button" onClick={importDefinition}>Importar HTML ou JSON</button></div>
      <button className="button primary" disabled={busy}>{busy ? "Salvando rascunho…" : "Salvar rascunho"}</button>
    </form>
  </section>;
}
