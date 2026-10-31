import { useEffect, useState, type ChangeEvent } from "react";
import type { LilyLandingPageConfig, LilyLandingPageId, LilyLandingSocialId } from "@carro-chefe/contracts";
import type { AuthPayload } from "../../../api";
import { LilyLoadingSpinner } from "../../../loading-spinner";
import { TemplateTextEditor } from "../template-studio/TemplateTextEditor";
import "../template-studio/template-studio.css";
import { WhatsAppText } from "../../rich-text/WhatsAppText";
import { getAdminLandingPage, getLandingOptions, saveLandingPage, uploadLandingMedia } from "../../landing/landing-api";
import { landingAdminCopy as copy } from "../../landing/landing-copy";
import type { LandingMedia, LandingOption } from "../../landing/landing-types";
import "./admin-landing.css";

type Tab = "banner" | "brand" | "showcase" | "sections";
type CropKey = "desktopCrop" | "mobileCrop";
type CropAxis = "x" | "y" | "zoom";
type ActionKind = LilyLandingPageConfig["banner"]["action"]["kind"];

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "banner", label: copy.tabs[0] },
  { id: "brand", label: copy.tabs[1] },
  { id: "showcase", label: copy.tabs[2] },
  { id: "sections", label: copy.tabs[3] }
];

function selectedActionTarget(config: LilyLandingPageConfig) {
  const action = config.banner.action;
  return action.kind === "none" ? "" : action.targetId;
}

function setActionTarget(config: LilyLandingPageConfig, targetId: string): LilyLandingPageConfig {
  const action = config.banner.action;
  if (action.kind === "none") return config;
  if (action.kind === "product") return { ...config, banner: { ...config.banner, action: { ...action, targetId } } };
  if (action.kind === "social") return { ...config, banner: { ...config.banner, action: { ...action, targetId: targetId as LilyLandingSocialId } } };
  return { ...config, banner: { ...config.banner, action: { ...action, targetId: targetId as LilyLandingPageId } } };
}

function emptyAction(kind: ActionKind): LilyLandingPageConfig["banner"]["action"] {
  if (kind === "none") return { kind };
  if (kind === "product") return { kind, targetId: "" };
  if (kind === "social") return { kind, targetId: "instagram" };
  return { kind, targetId: "cardapio" };
}

function getMedia(media: LandingMedia[], id: string | null) {
  return id ? media.find((item) => item.id === id) ?? null : null;
}

function CropControls({ config, device, update }: {
  config: LilyLandingPageConfig;
  device: "desktop" | "mobile";
  update: (key: CropAxis, value: number) => void;
}) {
  const key: CropKey = device === "desktop" ? "desktopCrop" : "mobileCrop";
  const crop = config.banner[key];
  const labels = [copy.horizontal, copy.vertical, copy.zoom];
  const values = [crop.x, crop.y, crop.zoom];
  const keys = ["x", "y", "zoom"] as const;
  return <fieldset className="landing-crop-controls">
    <legend>{copy.crop}</legend>
    <p>{copy.cropHint}</p>
    {keys.map((cropKey, index) => <label key={cropKey}>{labels[index]} <output>{values[index]}{cropKey === "zoom" ? "×" : "%"}</output>
      <input type="range" min={cropKey === "zoom" ? 1 : 0} max={cropKey === "zoom" ? 2.5 : 100} step={cropKey === "zoom" ? 0.05 : 1} value={crop[cropKey]} onChange={(event) => update(cropKey, Number(event.currentTarget.value))} />
    </label>)}
  </fieldset>;
}

function BannerPreview({ config, media, device }: { config: LilyLandingPageConfig; media: LandingMedia[]; device: "desktop" | "mobile" }) {
  const isMobile = device === "mobile";
  const id = isMobile && !config.banner.sameImage ? config.banner.mobileMediaId : config.banner.desktopMediaId;
  const asset = getMedia(media, id);
  const crop = isMobile ? config.banner.mobileCrop : config.banner.desktopCrop;
  return <div className={`landing-admin-banner-preview ${isMobile ? "is-mobile" : "is-desktop"}`} aria-label={isMobile ? copy.previewMobile : copy.previewDesktop}>
    {asset
      ? <img src={asset.url} alt={config.banner.altText || asset.altText || asset.originalName || "Prévia da arte CookLily"} style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})` }} />
      : <div className="landing-admin-banner-fallback"><strong>CookLily</strong><span>Prévia da arte do banner</span></div>}
    {config.banner.action.kind !== "none" && <span className="landing-admin-banner-action-hint">{copy.action}</span>}
  </div>;
}

export function AdminLandingPage({ session }: { session: AuthPayload }) {
  const [config, setConfig] = useState<LilyLandingPageConfig | null>(null);
  const [media, setMedia] = useState<LandingMedia[]>([]);
  const [tab, setTab] = useState<Tab>("banner");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [actionOptions, setActionOptions] = useState<LandingOption[]>([]);
  const [showcaseOptions, setShowcaseOptions] = useState<LandingOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminLandingPage().then((payload) => {
      if (!active) return;
      setConfig(payload.config);
      setMedia(payload.media);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a Landing Page.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const actionKind = config?.banner.action.kind;
  useEffect(() => {
    let active = true;
    if (!actionKind || actionKind === "none") { setActionOptions([]); return () => { active = false; }; }
    setOptionsLoading(true);
    const kind = actionKind;
    void getLandingOptions(kind).then((result) => { if (active) setActionOptions(result.options); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : copy.noOptions); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, [actionKind]);

  useEffect(() => {
    let active = true;
    if (config?.showcase.mode !== "carousel") { setShowcaseOptions([]); return () => { active = false; }; }
    void getLandingOptions("showcase").then((result) => { if (active) setShowcaseOptions(result.options); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : copy.noOptions); });
    return () => { active = false; };
  }, [config?.showcase.mode]);

  function updateCrop(device: "desktop" | "mobile", key: CropAxis, value: number) {
    if (!config) return;
    const cropKey: CropKey = device === "desktop" ? "desktopCrop" : "mobileCrop";
    setConfig({ ...config, banner: { ...config.banner, [cropKey]: { ...config.banner[cropKey], [key]: value } } });
  }

  async function upload(file: File | undefined, device: "desktop" | "mobile") {
    if (!file || !config) return;
    setUploading(device); setError(""); setMessage("");
    try {
      const uploaded = await uploadLandingMedia(file, session.csrfToken);
      const asset: LandingMedia = { id: uploaded.id, url: uploaded.url, originalName: uploaded.originalName, altText: uploaded.altText, mime: uploaded.mime };
      setMedia((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setConfig((current) => current ? {
        ...current,
        banner: device === "desktop"
          ? { ...current.banner, desktopMediaId: asset.id, ...(current.banner.sameImage ? {} : {}) }
          : { ...current.banner, sameImage: false, mobileMediaId: asset.id }
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a arte.");
    } finally { setUploading(null); }
  }

  async function save() {
    if (!config) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await saveLandingPage(config, session.csrfToken);
      setConfig(saved.config);
      setMessage(copy.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a Landing Page.");
    } finally { setSaving(false); }
  }

  if (loading) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando Landing Page" /></section>;
  if (!config) return <section className="admin-state"><p role="alert">{error || "Não foi possível abrir a Landing Page."}</p></section>;

  const targetId = selectedActionTarget(config);
  const previewMediaId = previewDevice === "mobile" && !config.banner.sameImage ? config.banner.mobileMediaId : config.banner.desktopMediaId;
  const hasActionTarget = config.banner.action.kind === "none" || actionOptions.some((option) => option.id === targetId);

  return <section className="admin-page landing-admin-page">
    <header className="admin-heading"><div><span className="eyebrow">CookLily · administração</span><h1>{copy.title}</h1><p>{copy.headingDescription}</p></div><div className="admin-actions"><a className="button ghost" href="/lilyacai/" target="_blank" rel="noreferrer">{copy.preview}</a><button className="button primary" type="button" disabled={saving || !hasActionTarget || optionsLoading} onClick={() => void save()}>{saving ? copy.saving : copy.save}</button></div></header>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    <nav className="landing-admin-tabs" aria-label="Configurações da Landing Page">{tabs.map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>

    {tab === "banner" && <div className="landing-admin-grid">
      <section className="checkout-section landing-admin-panel"><h2>{copy.tabs[0]}</h2>
        <label className="landing-admin-check"><input type="checkbox" checked={config.banner.sameImage} onChange={(event) => setConfig({ ...config, banner: { ...config.banner, sameImage: event.currentTarget.checked, mobileMediaId: event.currentTarget.checked ? null : config.banner.mobileMediaId } })} /><span>{copy.sameImage}</span></label>
        <label>{copy.desktopArt}<select value={config.banner.desktopMediaId ?? ""} onChange={(event) => setConfig({ ...config, banner: { ...config.banner, desktopMediaId: event.currentTarget.value || null } })}><option value="">Sem arte — mostrar apresentação da CookLily</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName ?? asset.altText}</option>)}</select></label>
        <label className="button ghost landing-upload-button">{uploading === "desktop" ? "Enviando…" : copy.upload}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" disabled={Boolean(uploading)} onChange={(event) => { void upload(event.currentTarget.files?.[0], "desktop"); event.currentTarget.value = ""; }} /></label>
        {!config.banner.sameImage && <><label>{copy.mobileArt}<select value={config.banner.mobileMediaId ?? ""} onChange={(event) => setConfig({ ...config, banner: { ...config.banner, mobileMediaId: event.currentTarget.value || null } })}><option value="">Usar arte de desktop</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName ?? asset.altText}</option>)}</select></label><label className="button ghost landing-upload-button">{uploading === "mobile" ? "Enviando…" : copy.upload}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" disabled={Boolean(uploading)} onChange={(event) => { void upload(event.currentTarget.files?.[0], "mobile"); event.currentTarget.value = ""; }} /></label></>}
        <label>{copy.altText}<input value={config.banner.altText} maxLength={240} onChange={(event) => setConfig({ ...config, banner: { ...config.banner, altText: event.currentTarget.value } })} /></label>
        <section className="landing-action-editor"><h3>{copy.action}</h3><p>{copy.availabilityNote}</p>
          <label>Tipo de destino<select value={config.banner.action.kind} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const kind = event.currentTarget.value as ActionKind;
            setConfig({ ...config, banner: { ...config.banner, action: emptyAction(kind) } });
          }}><option value="none">{copy.noAction}</option><option value="product">Produto do cardápio</option><option value="social">Rede social da CookLily</option><option value="page">Página do site</option></select></label>
          {config.banner.action.kind !== "none" && <label>{copy.selectTarget}<select value={targetId} disabled={optionsLoading || actionOptions.length === 0} onChange={(event) => setConfig(setActionTarget(config, event.currentTarget.value))}><option value="">{optionsLoading ? copy.optionsLoading : actionOptions.length ? copy.selectTarget : copy.noOptions}</option>{actionOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
          {config.banner.action.kind === "product" && <small>{copy.productSelectHint}</small>}
        </section>
      </section>
      <section className="checkout-section landing-admin-panel landing-banner-edit-preview"><div className="landing-preview-toolbar"><h2>Prévia do banner</h2><div><button type="button" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>{copy.desktop}</button><button type="button" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>{copy.mobile}</button></div></div>
        <BannerPreview config={config} media={media} device={previewDevice} />
        <CropControls config={config} device={previewDevice} update={(key, value) => updateCrop(previewDevice, key, value)} />
        {!previewMediaId && <p className="landing-preview-note">Envie ou escolha uma arte para visualizar o recorte.</p>}
      </section>
    </div>}

    {tab === "brand" && <div className="landing-admin-grid landing-admin-brand-grid">
      <section className="checkout-section landing-admin-panel"><h2>{copy.tabs[1]}</h2>
        <label>{copy.tagline}<input value={config.brand.tagline} maxLength={160} onChange={(event) => setConfig({ ...config, brand: { ...config.brand, tagline: event.currentTarget.value } })} /></label>
        <div className="template-builder"><label className="template-text-field"><strong>{copy.brandDescription}</strong><TemplateTextEditor label={copy.brandDescription} value={config.brand.description} variableNames={[]} onActivate={() => undefined} onChange={(description) => setConfig({ ...config, brand: { ...config.brand, description } })} rows={7} maxLength={3000} hint={copy.descriptionHint} placeholder="Conte, em poucas linhas, o que torna a CookLily especial." /></label></div>
      </section>
      <section className="checkout-section landing-admin-panel landing-brand-preview"><h2>Prévia da identidade</h2><span className="eyebrow">CookLily</span><p className="landing-preview-tagline">{config.brand.tagline}</p><div className="landing-rich-text"><WhatsAppText text={config.brand.description} /></div></section>
    </div>}

    {tab === "showcase" && <section className="checkout-section landing-admin-panel landing-showcase-editor"><h2>{copy.tabs[2]}</h2>
      <div className="landing-showcase-mode"><label className="landing-admin-check"><input type="radio" name="showcase-mode" checked={config.showcase.mode === "weekly"} onChange={() => setConfig({ ...config, showcase: { ...config.showcase, mode: "weekly" } })} /><span>{copy.weekly}</span></label><label className="landing-admin-check"><input type="radio" name="showcase-mode" checked={config.showcase.mode === "carousel"} onChange={() => setConfig({ ...config, showcase: { ...config.showcase, mode: "carousel" } })} /><span>{copy.carousel}</span></label></div>
      {config.showcase.mode === "carousel" && <><p>{copy.productSelectHint}</p><fieldset className="landing-product-picker"><legend>{copy.products}</legend>{showcaseOptions.map((product) => <label key={product.id} className={`landing-admin-check${product.available ? "" : " is-unavailable"}`}><input type="checkbox" checked={config.showcase.productIds.includes(product.id)} disabled={!product.available} onChange={(event) => setConfig({ ...config, showcase: { ...config.showcase, productIds: event.currentTarget.checked ? [...config.showcase.productIds, product.id] : config.showcase.productIds.filter((id) => id !== product.id) } })} /><span>{product.label}{!product.available && <small> · Indisponível</small>}</span></label>)}{showcaseOptions.length === 0 && <p>{copy.optionsLoading}</p>}</fieldset>
        <div className="landing-admin-column-controls"><label>{copy.desktopColumns}<select value={config.showcase.desktopColumns} onChange={(event) => setConfig({ ...config, showcase: { ...config.showcase, desktopColumns: Number(event.currentTarget.value) } })}>{[1,2,3,4].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>{copy.mobileColumns}<select value={config.showcase.mobileColumns} onChange={(event) => setConfig({ ...config, showcase: { ...config.showcase, mobileColumns: Number(event.currentTarget.value) } })}>{[1,2].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      </>}
      <fieldset className="landing-element-picker"><legend>{copy.elements}</legend>{Object.entries(copy.elementLabels).map(([key, label]) => <label key={key} className="landing-admin-check"><input type="checkbox" checked={config.showcase.elements[key as keyof typeof config.showcase.elements]} onChange={(event) => setConfig({ ...config, showcase: { ...config.showcase, elements: { ...config.showcase.elements, [key]: event.currentTarget.checked } } })} /><span>{label}</span></label>)}</fieldset>
    </section>}

    {tab === "sections" && <section className="checkout-section landing-admin-panel landing-sections-editor"><h2>{copy.tabs[3]}</h2>
      <label className="landing-admin-check"><input type="checkbox" checked={config.sections.rankingEnabled} onChange={(event) => setConfig({ ...config, sections: { ...config.sections, rankingEnabled: event.currentTarget.checked } })} /><span>{copy.ranking}</span></label>
      <label className="landing-admin-check"><input type="checkbox" checked={config.sections.reelsEnabled} onChange={(event) => setConfig({ ...config, sections: { ...config.sections, reelsEnabled: event.currentTarget.checked } })} /><span>{copy.reels}</span></label>
      {config.sections.reelsEnabled && <label>{copy.reelsTitle}<input value={config.sections.reelsTitle} maxLength={100} onChange={(event) => setConfig({ ...config, sections: { ...config.sections, reelsTitle: event.currentTarget.value } })} /></label>}
      <label className="landing-admin-check"><input type="checkbox" checked={config.sections.locationEnabled} onChange={(event) => setConfig({ ...config, sections: { ...config.sections, locationEnabled: event.currentTarget.checked } })} /><span>{copy.location}</span></label>
      {config.sections.locationEnabled && <p>{copy.locationHint}</p>}
      <p>{copy.blogHint}</p>
    </section>}
    <footer className="landing-admin-save-row"><a className="button ghost" href="/lilyacai/" target="_blank" rel="noreferrer">{copy.preview}</a><button className="button primary" type="button" disabled={saving || !hasActionTarget || optionsLoading} onClick={() => void save()}>{saving ? copy.saving : copy.save}</button></footer>
  </section>;
}
