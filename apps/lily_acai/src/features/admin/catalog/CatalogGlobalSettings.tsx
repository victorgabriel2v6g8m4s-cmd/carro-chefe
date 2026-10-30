import { useState } from "react";
import { getLilyAdminCatalog } from "../../../api";
import { FlavorAddonEditor } from "./FlavorAddonEditor";
import { CommercialEditor } from "./CommercialEditor";

export function CatalogGlobalSettings({ csrf, refresh, setError }: { csrf: string; refresh: () => Promise<void>; setError: (value: string) => void }) {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErrorMessage] = useState("");
  async function load() {
    if (settings || loading) return;
    setLoading(true);
    setErrorMessage("");
    try { setSettings(await getLilyAdminCatalog()); }
    catch (cause) { setErrorMessage(cause instanceof Error ? cause.message : "Não foi possível carregar os cadastros globais."); }
    finally { setLoading(false); }
  }
  return <details className="admin-create admin-catalog-settings" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
    <summary>Cadastros globais · sabores, adicionais, combos e ofertas</summary>
    {loading && <p className="admin-inline-loading" role="status">Carregando cadastros globais…</p>}
    {error && <p className="error" role="alert">{error} <button className="button ghost" type="button" onClick={(event) => { event.preventDefault(); void load(); }}>Tentar novamente</button></p>}
    {settings && <>
      <FlavorAddonEditor data={settings} csrf={csrf} refresh={refresh} setError={setError} />
      <CommercialEditor data={settings} csrf={csrf} refresh={refresh} setError={setError} />
    </>}
  </details>;
}
