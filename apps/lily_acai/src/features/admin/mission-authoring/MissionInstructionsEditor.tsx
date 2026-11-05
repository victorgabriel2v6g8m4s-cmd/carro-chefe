import { useState } from "react";
import { parseResponse } from "../../../api";
import { emptyMissionInstruction, type MissionInstructionDraft } from "./types";

type UploadedMedia = { id: string; originalName: string; url: string };

export function MissionInstructionsEditor({ instructions, csrfToken, onChange, onError }: { instructions: MissionInstructionDraft[]; csrfToken: string; onChange: (instructions: MissionInstructionDraft[]) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [mediaLabels, setMediaLabels] = useState<Record<number, string>>({});

  function update(index: number, patch: Partial<MissionInstructionDraft>) {
    onChange(instructions.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  }

  async function upload(index: number, file: File) {
    setUploading(index);
    onError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const media = await parseResponse<UploadedMedia>(await fetch("/api/v1/lily/admin/media", {
        method: "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": csrfToken }, body: form
      }));
      update(index, { mediaId: media.id });
      setMediaLabels((current) => ({ ...current, [index]: media.originalName }));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível anexar a mídia.");
    } finally {
      setUploading(null);
    }
  }

  return <div className="mission-authoring-list">
    {instructions.map((step, index) => <fieldset className="mission-authoring-card" key={index}>
      <legend>Etapa {index + 1}</legend>
      <label>Título da etapa<input required maxLength={120} value={step.title} onChange={(event) => update(index, { title: event.target.value })} /></label>
      <label>Como cumprir<textarea rows={3} maxLength={1000} value={step.body} onChange={(event) => update(index, { body: event.target.value })} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={step.required} onChange={(event) => update(index, { required: event.target.checked })} /> Etapa obrigatória</label>
      <label>Anexar imagem ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm" disabled={uploading !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(index, file); event.currentTarget.value = ""; }} /></label>
      {step.mediaId && <small>Mídia vinculada: {mediaLabels[index] ?? step.mediaId} · <a href={`/api/v1/lily/public/media/${encodeURIComponent(step.mediaId)}`} target="_blank" rel="noreferrer">pré-visualizar</a></small>}
      {uploading === index && <small role="status">Enviando mídia…</small>}
      <button type="button" className="button ghost" onClick={() => onChange(instructions.filter((_, stepIndex) => stepIndex !== index))}>Remover etapa</button>
    </fieldset>)}
    <button type="button" className="button ghost" onClick={() => onChange([...instructions, emptyMissionInstruction()])}>Adicionar etapa</button>
  </div>;
}
