import { Link } from "react-router-dom";

export function KnowledgeFilePreview({ upload, compact = false }: { upload: any; compact?: boolean }) {
  const image = String(upload.mimeType).startsWith("image/");
  return <Link className={`knowledge-file ${compact ? "knowledge-file--compact" : ""}`} to={upload.viewerRoute ?? `/gestao/visualizador?uploadId=${encodeURIComponent(upload.id)}`} title={`Pré-visualizar ${upload.originalName}`}>
    {image ? <img loading="lazy" src={upload.contentUrl ?? `/api/v1/uploads/${upload.id}/content?disposition=inline`} alt="" /> : <span className="file-icon" aria-hidden="true">{upload.mimeType === "application/pdf" ? "PDF" : "DOC"}</span>}
    <span><strong>{upload.originalName}</strong>{!compact && <small>{Math.ceil(upload.sizeBytes / 1024)} KB · pré-visualização</small>}</span>
  </Link>;
}
