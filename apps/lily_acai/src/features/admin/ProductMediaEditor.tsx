import { useEffect, useState } from "react";
import { lilyAdminJson, uploadLilyMedia } from "../../api";
import { AdminAutosaveStatus, useAdminAutosave } from "./useAdminAutosave";

type Asset = { id: string; url: string; originalName: string; altText: string; mime: string; size: number };

export function ProductMediaEditor({ productId, initialMedia, assets, csrf, onError }: {
  productId: string;
  initialMedia: Array<{ id: string }>;
  assets: Asset[];
  csrf: string;
  onError: (message: string) => void;
}) {
  const [mediaIds, setMediaIds] = useState(initialMedia.map((item) => item.id));
  const [localAssets, setLocalAssets] = useState(assets);
  const initialIds = initialMedia.map((item) => item.id).join("|");
  const selected = mediaIds.map((id) => localAssets.find((asset) => asset.id === id)).filter((item): item is Asset => Boolean(item));
  const autosave = useAdminAutosave(mediaIds, async (ids) => {
    await lilyAdminJson(`products/${productId}/media`, "PUT", csrf, { mediaIds: ids }, true);
  });

  useEffect(() => { setMediaIds(initialMedia.map((item) => item.id)); setLocalAssets(assets); }, [productId, initialIds]);

  function add(id: string) {
    if (!id || mediaIds.includes(id) || mediaIds.length >= 12) return;
    setMediaIds((current) => [...current, id]);
  }

  async function upload(file?: File) {
    if (!file) return;
    try {
      const uploaded = await uploadLilyMedia(file, csrf);
      const asset: Asset = { ...uploaded, size: file.size };
      setLocalAssets((current) => [...current, asset]);
      add(asset.id);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível enviar a mídia.");
    }
  }

  return <section className="product-media-editor" aria-label="Mídias do Reel">
    <div className="product-media-heading"><div><h3>Mídias do Reel</h3><p>A capa é escolhida acima; aqui você ordena as mídias seguintes.</p></div><label className="button ghost">Enviar foto ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
    <label>Adicionar da biblioteca<select defaultValue="" onChange={(event) => { add(event.currentTarget.value); event.currentTarget.value = ""; }}><option value="">Escolha uma mídia…</option>{localAssets.filter((asset) => !mediaIds.includes(asset.id)).map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select></label>
    {selected.length ? <ol className="product-media-list">{selected.map((asset, index) => <li key={asset.id}>
      {asset.mime.startsWith("video/") ? <video src={asset.url} muted playsInline controls preload="metadata" aria-label={asset.altText || asset.originalName} /> : <img src={asset.url} alt={asset.altText || asset.originalName} />}
      <span><strong>{`Mídia ${index + 1}`}</strong><small>{asset.originalName}</small></span>
      <button type="button" className="button ghost" disabled={index === 0} onClick={() => setMediaIds((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; return next; })} aria-label={`Mover ${asset.originalName} para cima`}>↑</button>
      <button type="button" className="button ghost" disabled={index === selected.length - 1} onClick={() => setMediaIds((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1]!, next[index]!]; return next; })} aria-label={`Mover ${asset.originalName} para baixo`}>↓</button>
      <button type="button" className="button ghost" onClick={() => setMediaIds((current) => current.filter((id) => id !== asset.id))} aria-label={`Remover ${asset.originalName}`}>Remover</button>
    </li>)}</ol> : <p className="empty-state">Adicione ao menos uma foto ou vídeo para exibir este produto nos Reels.</p>}
    <AdminAutosaveStatus {...autosave} />
  </section>;
}
