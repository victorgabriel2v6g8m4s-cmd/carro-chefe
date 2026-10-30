import { useEffect, useRef, useState, type FormEvent } from "react";
import { getLilyAdminProductEditor, lilyAdminJson } from "../../../api";
import { AdminAutosaveStatus, useAdminAutosave } from "../useAdminAutosave";
import { ProductMediaEditor } from "../ProductMediaEditor";
import { AllergenAdminFields, allergenPayload, normalizeAdminAllergens, type AdminAllergenValue } from "../AllergenAdminFields";
import { CatalogProductCard } from "../../catalog/CatalogProductCard";
import { PriceDisplay } from "../../pricing/PriceDisplay";
import { moneyInput, parseMoney } from "./product-money";
import type { AdminProductSummary } from "./types";

function ProductVariantEditor({ variant, index, variants, csrf }: {
  variant: any;
  index: number;
  variants: any[];
  csrf: string;
}) {
  const [draft, setDraft] = useState({
    name: variant.name,
    price: moneyInput(variant.priceCents),
    compareAtPrice: moneyInput(variant.compareAtPriceCents),
    isAvailable: Boolean(variant.isAvailable),
    status: variant.status,
    isDefault: Number(variant.sortOrder) === 0 || index === 0
  });
  const autosave = useAdminAutosave(draft, async (next) => {
    if (!next.name.trim() || parseMoney(next.price) <= 0) throw new Error("Informe o nome da opção e um preço maior que zero.");
    const compareAtPriceCents = next.compareAtPrice.trim() ? parseMoney(next.compareAtPrice) : null;
    if (compareAtPriceCents != null && compareAtPriceCents <= parseMoney(next.price)) {
      throw new Error("O preço anterior precisa ser maior que o preço atual.");
    }
    if (next.isDefault) {
      await Promise.all(variants.filter((item) => item.id !== variant.id).map((item, order) =>
        lilyAdminJson(`variants/${item.id}`, "PATCH", csrf, { sortOrder: order + 10 }, true)
      ));
    }
    await lilyAdminJson(`variants/${variant.id}`, "PATCH", csrf, {
      name: next.name.trim(),
      priceCents: parseMoney(next.price),
      compareAtPriceCents,
      isAvailable: next.isAvailable,
      status: next.status,
      sortOrder: next.isDefault ? 0 : Number(variant.sortOrder) === 0 ? index + 10 : variant.sortOrder
    }, true);
  });

  return <div className="variant-row">
    <label>Nome da opção<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
    <label>Preço atual<input value={draft.price} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
    <label>Preço antigo (opcional)<input value={draft.compareAtPrice} inputMode="decimal" placeholder="Ex.: 24,90" onChange={(event) => setDraft((current) => ({ ...current, compareAtPrice: event.target.value }))} /></label>
    <label>Status<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select></label>
    <label className="toggle"><input type="checkbox" checked={draft.isAvailable} onChange={(event) => setDraft((current) => ({ ...current, isAvailable: event.target.checked }))} /> Disponível</label>
    <label className="toggle"><input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} /> Definir como padrão</label>
    <AdminAutosaveStatus {...autosave} />
  </div>;
}

export function ProductEditor({ product: summary, csrf, refresh, setError }: {
  product: AdminProductSummary;
  csrf: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [editorData, setEditorData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function loadEditor() {
    if (editorData || loading) return;
    setLoading(true);
    setLoadError("");
    try {
      setEditorData(await getLilyAdminProductEditor(summary.id));
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Não foi possível carregar as configurações do produto.");
    } finally {
      setLoading(false);
    }
  }
  function openEditor() {
    dialogRef.current?.showModal();
    void loadEditor();
  }
  const lowestPrice = summary.variants[0];
  const statusBadge = summary.status === "published" ? (summary.isPurchasable ? "Disponível" : "Indisponível")
    : summary.status === "paused" ? "Pausado" : "Rascunho";

  return <>
    <CatalogProductCard
      product={{
        displayName: summary.displayName,
        categoryName: summary.category.name,
        cover: summary.cover
      }}
      onOpen={openEditor}
      price={lowestPrice
        ? <><small>{statusBadge} · {summary.variants.length > 1 ? "A partir de" : "Preço"}</small><PriceDisplay currentPriceCents={lowestPrice.priceCents} compareAtPriceCents={lowestPrice.compareAtPriceCents} density="compact" /></>
        : <><small>{statusBadge}</small><strong>Preço não definido</strong></>}
    />
    <dialog
      ref={dialogRef}
      className="admin-product-dialog"
      aria-label={`Editar ${summary.displayName}`}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
    >
      <section className="product-modal-content admin-product-dialog-content" aria-labelledby={`admin-product-title-${summary.id}`}>
        <header className="section-heading">
          <div><span className="eyebrow">{summary.category.name}</span><h2 id={`admin-product-title-${summary.id}`}>{summary.displayName}</h2></div>
          <button className="modal-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Fechar editor">×</button>
        </header>
        {loading && <p className="admin-inline-loading" role="status">Carregando configurações de {summary.displayName}…</p>}
        {loadError && <p className="error" role="alert">{loadError} <button className="button ghost" type="button" onClick={() => void loadEditor()}>Tentar novamente</button></p>}
        {editorData && <ProductEditorForm product={editorData.product} data={editorData} csrf={csrf} refresh={refresh} setError={setError} />}
      </section>
    </dialog>
  </>;
}

function ProductEditorForm({ product, data, csrf, refresh, setError }: {
  product: any;
  data: Record<string, any>;
  csrf: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [draft, setDraft] = useState({
    displayName: product.displayName,
    descriptiveName: product.descriptiveName ?? "",
    description: product.description ?? "",
    categoryId: product.category.id,
    status: product.rawStatus ?? product.status,
    isAvailable: product.isAvailable,
    featured: product.featured,
    weeklyHighlight: product.weeklyHighlight,
    vipEarlyAccess: product.vipEarlyAccess ?? false,
    vipTeaserDescription: product.vipTeaserDescription ?? "",
    sortOrder: product.sortOrder,
    coverMediaId: product.cover?.id ?? ""
  });
  const [busy, setBusy] = useState(false);
  const [allergens, setAllergens] = useState<AdminAllergenValue>(() => normalizeAdminAllergens(product.rawAllergens));
  const productAutosave = useAdminAutosave({
    ...draft,
    allergens: allergenPayload(allergens),
    coverMediaId: draft.coverMediaId || null
  }, async (next) => {
    await lilyAdminJson(`products/${product.id}`, "PATCH", csrf, next, true);
  });

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      featured: product.featured,
      weeklyHighlight: product.weeklyHighlight
    }));
  }, [product.featured, product.weeklyHighlight]);

  const [flavorIds, setFlavorIds] = useState<string[]>(product.rawFlavorIds ?? []);
  const [addonIds, setAddonIds] = useState<string[]>((product.rawAddonLinks ?? []).filter((item: any) => item.allowed).map((item: any) => item.addonId));
  const [minimumAddonUnits, setMinimumAddonUnits] = useState<number>(product.minimumAddonUnits ?? 0);
  const [maximumAddonUnits, setMaximumAddonUnits] = useState<number>(product.maximumAddonUnits ?? 4);
  const [addonOverrides, setAddonOverrides] = useState<Record<string, { priceCents: number; individualLimit: number }>>(() =>
    Object.fromEntries((product.rawAddonLinks ?? []).map((item: any) => [item.addonId, {
      priceCents: item.priceOverride ?? data.addons.find((addon: any) => addon.id === item.addonId)?.priceCents ?? 0,
      individualLimit: item.individualLimit ?? data.addons.find((addon: any) => addon.id === item.addonId)?.individualLimit ?? 2
    }]))
  );
  const [mixTiers, setMixTiers] = useState<Array<{ flavorCount: number; sizeMl: number; priceCents: number; compareAtPriceCents: number | null; status: string }>>(
    (product.mixTiers ?? []).map((tier: any) => ({ flavorCount: tier.flavorCount, sizeMl: tier.sizeMl, priceCents: tier.priceCents, compareAtPriceCents: tier.compareAtPriceCents ?? null, status: "published" }))
  );

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const used = new Set<number>((product.rawVariants ?? []).map((item: any) => Number(item.sizeMl)));
    const makeDefault = form.get("isDefault") === "on";
    let sizeMl = 1_000_000_000;
    while (used.has(sizeMl) && sizeMl < 2_000_000_000) sizeMl += 1;
    if (sizeMl >= 2_000_000_000) {
      setError("Não foi possível gerar um identificador interno para esta opção.");
      return;
    }
    const name = String(form.get("name") ?? "").trim();
    const price = String(form.get("price") ?? "").trim();
    if (name.length < 2 || name.length > 80 || !price || parseMoney(price) <= 0) {
      setError("Informe o nome da opção e um preço maior que zero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (makeDefault) {
        for (const [index, other] of (product.rawVariants ?? []).entries()) {
          await lilyAdminJson(`variants/${other.id}`, "PATCH", csrf, { sortOrder: index + 10 });
        }
      }
      await lilyAdminJson("variants", "POST", csrf, {
        productId: product.id,
        sizeMl,
        name,
        priceCents: parseMoney(price),
        status: "draft",
        isAvailable: false,
        sortOrder: makeDefault ? 0 : (product.rawVariants?.length ?? 0) + 10
      });
      formElement.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar variação.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRelations() {
    setError("");
      await lilyAdminJson(`products/${product.id}/flavors`, "PUT", csrf, { flavorIds }, true);
      await lilyAdminJson(`products/${product.id}`, "PATCH", csrf, { minimumAddonUnits, maximumAddonUnits }, true);
      const nutellaFlavor = data.flavors.find((flavor: any) => flavor.slug === "nutella");
      const productHasNutella = Boolean(nutellaFlavor && flavorIds.includes(nutellaFlavor.id));
      await lilyAdminJson(`products/${product.id}/addons`, "PUT", csrf, {
        addons: addonIds.map((addonId) => {
          const addon = data.addons.find((item: any) => item.id === addonId);
          const existing = (product.rawAddonLinks ?? []).find((item: any) => item.addonId === addonId);
          return {
            addonId,
            allowed: true,
            individualLimit: addonOverrides[addonId]?.individualLimit ?? existing?.individualLimit ?? (productHasNutella && addon?.slug === "nutella" ? 1 : addon?.individualLimit ?? 2),
            priceOverride: addonOverrides[addonId]?.priceCents ?? existing?.priceOverride ?? null
          };
        })
      }, true);
      if (product.configurationType === "lilymix") {
        await lilyAdminJson(`products/${product.id}/mix-tiers`, "PUT", csrf, { tiers: mixTiers }, true);
      }
  }
  const relationsAutosave = useAdminAutosave({ flavorIds, addonIds, minimumAddonUnits, maximumAddonUnits, addonOverrides, mixTiers }, saveRelations);

  async function createAddonForProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    try {
      const created = await lilyAdminJson<any>("addons", "POST", csrf, {
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        priceCents: parseMoney(String(form.get("price"))),
        portion300: Number(form.get("portion300")),
        portion500: Number(form.get("portion500")),
        individualLimit: 2,
        status: "published"
      });
      setAddonIds((current) => [...new Set([...current, created.id])]);
      setAddonOverrides((current) => ({ ...current, [created.id]: { priceCents: created.priceCents, individualLimit: created.individualLimit } }));
      formElement.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar adicional para o produto.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-product-editor-content" id={product.slug}>
    <div className="admin-product-grid">
      <div className="admin-span">
        <strong>Prévia pública do produto</strong>
        <label>Link para compartilhar<input readOnly value={`${window.location.origin}${import.meta.env.BASE_URL}cardapio?produto=${encodeURIComponent(product.slug)}`} onFocus={(event) => event.currentTarget.select()} /></label>
        <a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio?produto=${encodeURIComponent(product.slug)}`} target="_blank" rel="noreferrer">Abrir prévia</a>
        <button className="button ghost" type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}cardapio?produto=${encodeURIComponent(product.slug)}`)}>Copiar link</button>
      </div>
      <label>Nome<input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} /></label>
      <label>Nome descritivo<input value={draft.descriptiveName} onChange={(e) => setDraft({ ...draft, descriptiveName: e.target.value })} /></label>
      <label>Categoria<select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
        {data.categories.map((category: any) => <option value={category.id} key={category.id}>{category.name}</option>)}
      </select></label>
      <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
        <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option>
      </select></label>
      <label>Ordem<input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></label>
      <label>Capa<select value={draft.coverMediaId} onChange={(e) => setDraft({ ...draft, coverMediaId: e.target.value })}>
        <option value="">Placeholder</option>
        {data.media.filter((media: any) => media.status === "active").map((media: any) =>
          <option value={media.id} key={media.id}>{media.originalName}</option>)}
      </select></label>
      <label className="admin-span">Descrição<textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <label className="toggle"><input type="checkbox" checked={draft.isAvailable} onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })} /> Disponível</label>
      <label className="toggle"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Mais pedido · etiqueta na grade</label>
      <label className="toggle"><input type="checkbox" checked={draft.weeklyHighlight} onChange={(e) => setDraft({ ...draft, weeklyHighlight: e.target.checked })} /> Escolha da semana · banner exclusivo</label>
      <label className="toggle"><input type="checkbox" checked={draft.vipEarlyAccess} onChange={(e) => setDraft({ ...draft, vipEarlyAccess: e.target.checked })} /> Lançamento antecipado VIP</label>
      {draft.vipEarlyAccess && <label className="admin-span">Frase exibida para clientes comuns<textarea rows={2} maxLength={300} value={draft.vipTeaserDescription} placeholder="Um lançamento especial está sendo preparado para os membros VIP." onChange={(e) => setDraft({ ...draft, vipTeaserDescription: e.target.value })} /></label>}
      <div className="admin-span"><AllergenAdminFields catalog={data.allergenCatalog ?? []} value={allergens} onChange={setAllergens} /></div>
       <AdminAutosaveStatus {...productAutosave} />
    </div>
    <ProductMediaEditor productId={product.id} initialMedia={product.gallery ?? []} assets={data.media.filter((media: any) => media.status === "active").map((media: any) => ({ ...media, url: media.url ?? `/api/v1/lily/public/media/${media.id}` }))} csrf={csrf} onError={setError} />
    <div className="variant-admin">
      <h4>{product.rawVariants.length === 1 && product.rawVariants[0]?.name === "Preço fixo" ? "Preço fixo do produto" : "Variações e preços"}</h4>
      {product.rawVariants.map((variant: any, index: number) => <ProductVariantEditor key={variant.id} variant={variant} index={index} variants={product.rawVariants} csrf={csrf} />)}
      <form className="variant-row" onSubmit={createVariant}>
        <label>Nova opção<input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Unidade, Caixa com 6, Fatia" /></label>
        <label>Preço<input name="price" required inputMode="decimal" placeholder="12,00" /></label>
        <label className="toggle"><input name="isDefault" type="checkbox" /> Tornar padrão</label>
        <button className="button ghost" type="submit" disabled={busy}>Adicionar opção</button>
      </form>
    </div>

    <div className="product-rules-admin">
      <div>
        <h4>Sabores deste produto</h4>
        <div className="admin-check-grid">
          {data.flavors.map((flavor: any) => <label key={flavor.id} className="toggle">
            <input type="checkbox" checked={flavorIds.includes(flavor.id)} onChange={(event) =>
              setFlavorIds((current) => event.target.checked ? [...new Set([...current, flavor.id])] : current.filter((id) => id !== flavor.id))
            } />
            {flavor.name}
          </label>)}
        </div>
      </div>
      <div>
        <h4>Adicionais aceitos</h4>
        <div className="admin-check-grid">
          <p>Use adicionais já cadastrados ou crie um no cadastro de adicionais; preço e limite abaixo valem apenas para este produto.</p>
          {data.addons.map((addon: any) => <div key={addon.id} className="addon-row">
            <label className="toggle"><input type="checkbox" checked={addonIds.includes(addon.id)} onChange={(event) => {
              setAddonIds((current) => event.target.checked ? [...new Set([...current, addon.id])] : current.filter((id) => id !== addon.id));
              setAddonOverrides((current) => current[addon.id] ? current : { ...current, [addon.id]: { priceCents: addon.priceCents, individualLimit: addon.individualLimit } });
            }} />{addon.name}</label>
            {addonIds.includes(addon.id) && <>
              <label>Preço neste produto<input inputMode="decimal" value={moneyInput(addonOverrides[addon.id]?.priceCents ?? addon.priceCents)} onChange={(event) => setAddonOverrides((current) => ({ ...current, [addon.id]: { ...current[addon.id], priceCents: parseMoney(event.target.value) } }))} /></label>
              <label>Máximo deste adicional<input type="number" min="1" max="10" value={addonOverrides[addon.id]?.individualLimit ?? addon.individualLimit} onChange={(event) => setAddonOverrides((current) => ({ ...current, [addon.id]: { ...current[addon.id], individualLimit: Number(event.target.value) } }))} /></label>
            </>}
          </div>)}
          <form className="admin-form-grid compact admin-span" onSubmit={createAddonForProduct}>
            <strong>Criar adicional reutilizável para este produto</strong>
            <label>Nome<input name="name" required minLength={2} /></label>
            <label>Slug único<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
            <label>Preço inicial<input name="price" required inputMode="decimal" placeholder="0,00" /></label>
            <label>Porção 300 ml<input name="portion300" type="number" min="0" required /></label>
            <label>Porção 500 ml<input name="portion500" type="number" min="0" required /></label>
            <button className="button ghost" type="submit" disabled={busy}>Criar e selecionar adicional</button>
          </form>
        </div>
      </div>
      <div className="admin-span">
        <h4>Quantidade de adicionais do produto</h4>
        <label>Mínimo obrigatório<input type="number" min="0" max="20" value={minimumAddonUnits} onChange={(event) => setMinimumAddonUnits(Number(event.target.value))} /></label>
        <label>Máximo total<input type="number" min="0" max="20" value={maximumAddonUnits} onChange={(event) => setMaximumAddonUnits(Number(event.target.value))} /></label>
      </div>
      {product.configurationType === "lilymix" && <div className="admin-span">
        <h4>Preços LilyMix por número de sabores</h4>
        <div className="tier-grid">
          {mixTiers.map((tier, index) => <div key={`${tier.sizeMl}-${tier.flavorCount}`} className="tier-price-row">
            <strong>{tier.sizeMl} ml · {tier.flavorCount} sabor{tier.flavorCount > 1 ? "es" : ""}</strong>
            <label>Preço atual<input value={moneyInput(tier.priceCents)} onChange={(event) => {
              const next = [...mixTiers];
              next[index] = { ...tier, priceCents: parseMoney(event.target.value) };
              setMixTiers(next);
            }} /></label>
            <label>Preço antigo (opcional)<input value={moneyInput(tier.compareAtPriceCents)} onChange={(event) => {
              const next = [...mixTiers];
              next[index] = { ...tier, compareAtPriceCents: event.target.value.trim() ? parseMoney(event.target.value) : null };
              setMixTiers(next);
            }} /></label>
          </div>)}
        </div>
      </div>}
      <AdminAutosaveStatus {...relationsAutosave} />
    </div>
  </div>;
}
