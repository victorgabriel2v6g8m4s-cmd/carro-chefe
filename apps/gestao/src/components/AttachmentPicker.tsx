import { useEffect, useState } from "react";

export function AttachmentPicker({ files, onChange, disabled = false }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const file of files) if (file.type.startsWith("image/")) next[`${file.name}-${file.lastModified}`] = URL.createObjectURL(file);
    setPreviews(next);
    return () => Object.values(next).forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  function add(selected: FileList | null) {
    if (!selected) return;
    const merged = [...files, ...Array.from(selected)].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index).slice(0, 12);
    onChange(merged);
  }
  return <div className="attachment-picker"><label className="attachment-button"><input disabled={disabled} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,application/pdf,text/plain,text/csv,application/json,.docx,.xlsx,.pptx" onChange={(event) => { add(event.target.files); event.currentTarget.value = ""; }} /><span aria-hidden="true">＋</span> Anexar mídias ou documentos</label>{files.length > 0 && <div className="attachment-list">{files.map((file) => { const key = `${file.name}-${file.lastModified}`; return <article key={key}>{previews[key] ? <img src={previews[key]} alt="" /> : <span className="file-icon" aria-hidden="true">DOC</span>}<div><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></div><button type="button" aria-label={`Remover ${file.name}`} onClick={() => onChange(files.filter((item) => item !== file))}>×</button></article>; })}</div>}</div>;
}
