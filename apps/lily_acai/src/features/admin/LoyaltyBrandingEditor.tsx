import { useEffect, useState, type ChangeEvent } from "react";
import { uploadLilyMedia, parseResponse, type AuthPayload } from "../../api";
import type { LoyaltyBranding } from "./loyalty-types";

type BrandState = LoyaltyBranding & { coinIconUrl: string | null };

export function LoyaltyBrandingEditor({ initial, session, onSaved, onError, onMessage }: {
  initial: BrandState;
  session: AuthPayload;
  onSaved: (branding: BrandState) => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(initial), [initial.coinName, initial.coinIconMediaId, initial.coinIconUrl]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { onError("Use uma imagem de até 5 MB para a arte das LilyCoins."); return; }
    try {
      const media = await uploadLilyMedia(file, session.csrfToken);
      setDraft((current) => ({ ...current, coinIconMediaId: media.id, coinIconUrl: media.url }));
    } catch (cause) { onError(cause instanceof Error ? cause.message : "Não foi possível enviar a arte das LilyCoins."); }
  }

  async function save() {
    setBusy(true);
    try {
      const result = await parseResponse<{ coinName: string; coinIconMediaId: string | null; coinIconUrl: string | null }>(await fetch("/api/v1/lily/admin/loyalty/branding", {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken },
        body: JSON.stringify({ coinName: draft.coinName, coinIconMediaId: draft.coinIconMediaId })
      }));
      onSaved(result);
      onMessage("Nome e arte da moeda salvos. O header da CookLily já usa a nova identidade.");
    } catch (cause) { onError(cause instanceof Error ? cause.message : "Não foi possível salvar a identidade da moeda."); }
    finally { setBusy(false); }
  }

  return <section className="loyalty-branding-panel" aria-labelledby="loyalty-branding-title">
    <div><span className="eyebrow">Identidade da moeda</span><h2 id="loyalty-branding-title">LilyCoins no header</h2><p>Defina o nome e a arte que aparecem junto ao saldo do cliente.</p></div>
    <div className="loyalty-branding-fields">
      <label>Nome exibido<input value={draft.coinName} maxLength={32} onChange={(event) => setDraft((current) => ({ ...current, coinName: event.target.value }))} /></label>
      <label className="button ghost loyalty-icon-upload">Enviar arte<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload(event)} /></label>
      {draft.coinIconUrl && <div className="loyalty-brand-preview"><img src={draft.coinIconUrl} alt="Prévia da arte da moeda" /><span>{draft.coinName || "Moeda"}</span><button type="button" className="button ghost" onClick={() => setDraft((current) => ({ ...current, coinIconMediaId: null, coinIconUrl: null }))}>Remover arte</button></div>}
      <button type="button" className="button primary" disabled={busy || !draft.coinName.trim()} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar identidade"}</button>
    </div>
  </section>;
}
