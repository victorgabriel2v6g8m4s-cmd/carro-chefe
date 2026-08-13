import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export function ResourceViewer() {
  const [params] = useSearchParams();
  const uploadId = params.get("uploadId");
  const filePath = params.get("path");
  const [resource, setResource] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setResource(null); setError("");
    const request = uploadId ? api<any>(`/api/v1/uploads/${uploadId}`).then((item) => ({ ...item, kind: item.mimeType.startsWith("image/") ? "image" : item.mimeType === "application/pdf" ? "pdf" : item.mimeType.startsWith("text/") || item.mimeType === "application/json" ? "text-upload" : "download", contentUrl: `/api/v1/uploads/${item.id}/content?disposition=inline` }))
      : filePath ? api<any>(`/api/v1/files/preview?path=${encodeURIComponent(filePath)}`) : Promise.reject(new Error("Nenhum arquivo foi informado."));
    request.then(setResource).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [uploadId, filePath]);
  return <div className="page-stack"><div className="breadcrumbs"><Link to="/gestao/tarefas">Central Operacional</Link><span>/</span><span>Visualizador</span></div>
    <section className="intro"><span className="eyebrow">Referência segura</span><h2>{resource?.originalName || resource?.name || "Visualizador de arquivo"}</h2><p>{resource?.path || (resource ? `${resource.mimeType} · ${Math.ceil(resource.sizeBytes / 1024)} KB` : "Abrindo referência…")}</p></section>
    {error ? <section className="panel empty"><h3>Não foi possível abrir</h3><p>{error}</p></section> : !resource ? <section className="panel loading">Carregando visualização…</section> : <section className="panel resource-viewer">
      {resource.kind === "image" && <img src={resource.contentUrl} alt={resource.originalName || resource.name} />}
      {resource.kind === "pdf" && <iframe title={resource.originalName || resource.name} src={resource.contentUrl} />}
      {resource.kind === "text" && <pre>{resource.text}</pre>}
      {resource.kind === "text-upload" && <iframe title={resource.originalName} src={resource.contentUrl} />}
      {["download", "unsupported"].includes(resource.kind) && <div className="empty"><p>Este formato não possui pré-visualização segura no navegador.</p>{resource.contentUrl && <a className="button" href={resource.contentUrl.replace("disposition=inline", "disposition=attachment")}>Baixar arquivo</a>}</div>}
    </section>}
  </div>;
}
