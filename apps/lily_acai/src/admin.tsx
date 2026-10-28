import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getLilyAdminCatalog, getLilySession, lilyAdminJson, uploadLilyMedia, type AuthPayload } from "./api";
import { LilyLoadingSpinner } from "./loading-spinner";
import { AdminAutosaveStatus, useAdminAutosave } from "./features/admin/useAdminAutosave";

function moneyInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function parseMoney(input: string) {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}


type AdminAllergenValue = {
  reviewStatus: "unreviewed" | "reviewed";
  contains: string[];
  mayContain: string[];
};

function normalizeAdminAllergens(input: any): AdminAllergenValue {
  return {
    reviewStatus: input?.reviewStatus === "reviewed" ? "reviewed" : "unreviewed",
    contains: Array.isArray(input?.contains) ? input.contains.map(String) : [],
    mayContain: Array.isArray(input?.mayContain) ? input.mayContain.map(String) : []
  };
}

function selectedValues(target: HTMLSelectElement) {
  return Array.from(target.selectedOptions).map((option) => option.value);
}

const adminAutosaveTimers = new WeakMap<HTMLFormElement, number>();
function queueAdminFormSave(form: HTMLFormElement) {
  const prior = adminAutosaveTimers.get(form);
  if (prior) window.clearTimeout(prior);
  const status = form.querySelector<HTMLElement>("[data-autosave-status]");
  if (status) status.textContent = "Alteração pendente…";
  adminAutosaveTimers.set(form, window.setTimeout(() => {
    if (status) status.textContent = "Salvando automaticamente…";
    form.requestSubmit();
  }, 650));
}

function setFormAutosaveStatus(form: HTMLFormElement, text: string, state: "saved" | "saving" | "error") {
  const status = form.querySelector<HTMLElement>("[data-autosave-status]");
  if (status) { status.textContent = text; status.dataset.state = state; }
}

function allergenPayload(value: AdminAllergenValue) {
  return {
    allergenReviewStatus: value.reviewStatus,
    allergenContains: value.contains,
    allergenMayContain: value.mayContain
  };
}

function AllergenAdminFields(props: {
  catalog: Array<{ code: string; label: string }>;
  value: AdminAllergenValue;
  onChange: (value: AdminAllergenValue) => void;
}) {
  return <fieldset className="admin-allergen-fields">
    <legend>Alergênicos</legend>
    <label>Revisão
      <select
        value={props.value.reviewStatus}
        onChange={(event) => props.onChange({ ...props.value, reviewStatus: event.target.value === "reviewed" ? "reviewed" : "unreviewed" })}
      >
        <option value="unreviewed">Pendente de revisão</option>
        <option value="reviewed">Revisado</option>
      </select>
    </label>
    <label>CONTÉM
      <select
        multiple
        size={5}
        value={props.value.contains}
        onChange={(event) => props.onChange({ ...props.value, contains: selectedValues(event.target) })}
      >
        {props.catalog.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    <label>PODE CONTER
      <select
        multiple
        size={5}
        value={props.value.mayContain}
        onChange={(event) => props.onChange({ ...props.value, mayContain: selectedValues(event.target) })}
      >
        {props.catalog.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    <small>
      “Pendente de revisão” nunca é tratado como ausência de alergênicos. Não selecione o mesmo item em CONTÉM e PODE CONTER.
    </small>
  </fieldset>;
}

function ComponentAllergenEditor(props: {
  endpoint: "flavors" | "addons";
  item: any;
  catalog: Array<{ code: string; label: string }>;
  csrf: string;
}) {
  const [value, setValue] = useState<AdminAllergenValue>(() => normalizeAdminAllergens(props.item.allergens));
  const autosave = useAdminAutosave(value, async (next) => {
    await lilyAdminJson(`${props.endpoint}/${props.item.id}`, "PATCH", props.csrf, { allergens: allergenPayload(next) }, true);
  });

  return <details className="admin-allergen-component">
    <summary>
      <strong>{props.item.name}</strong>
      <span className={value.reviewStatus === "reviewed" ? "state-live" : "state-off"}>
        {value.reviewStatus === "reviewed" ? "Alergênicos revisados" : "Revisão pendente"}
      </span>
    </summary>
    <AllergenAdminFields catalog={props.catalog} value={value} onChange={setValue} />
    <AdminAutosaveStatus {...autosave} />
  </details>;
}

function useAdminData() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    try {
      const current = await getLilySession();
      if (!["staff", "admin"].includes(current.user.role)) throw new Error("Sua conta não possui perfil staff CookLily.");
      setSession(current);
      setData(await getLilyAdminCatalog());
    } catch (cause) {
      if (!data) {
        setSession(null);
        setData(null);
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  return { session, data, error, loading, refresh, setError };
}

export function AdminGate({ children }: { children: (state: ReturnType<typeof useAdminData>) => ReactNode }) {
  const state = useAdminData();
  if (state.loading) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando painel"/></section>;
  if (!state.session || !state.data) return <section className="admin-state">
    <span className="eyebrow">Painel CookLily</span>
    <h1>Acesso staff necessário.</h1>
    <p>{state.error || "Entre com uma conta da equipe para administrar o catálogo."}</p>
    <a className="button primary" href={`${import.meta.env.BASE_URL}entrar?next=${encodeURIComponent(window.location.pathname.replace(/^\/lilyacai/, "") || "/painel")}`}>Entrar</a>
  </section>;
  return <>{children(state)}</>;
}

export function AdminHome() {
  return <AdminGate>{({ data, session }) => <section className="admin-page">
    <div className="admin-heading">
      <div><span className="eyebrow">CookLily · operação</span><h1>Painel do catálogo</h1><p>Olá, {session!.user.displayName ?? session!.user.phone}.</p></div>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Abrir cardápio</a>
    </div>
    <div className="admin-kpis">
      <article><strong>{data!.products.length}</strong><span>produtos</span></article>
      <article><strong>{data!.categories.length}</strong><span>categorias</span></article>
      <article><strong>{data!.flavors.length}</strong><span>sabores</span></article>
      <article><strong>{data!.addons.length}</strong><span>adicionais</span></article>
      <article><strong>{data!.media.length}</strong><span>mídias</span></article>
    </div>
    <div className="admin-actions">
      <a className="button primary" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Administrar cardápio</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/pesquisas`}>Pesquisas</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cupons`}>Cupons e ofertas</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/vip`}>Programa VIP</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/fidelidade`}>Níveis e LilyCoins</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/midias`}>Mídias</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/entrega`}>Entrega e retirada</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/configuracoes`}>Configurações da loja</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/pagamentos/metodos`}>Métodos e descontos</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/pagamentos`}>Pagamentos e reconciliação</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/pedidos`}>Pedidos</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/analytics`}>Analytics</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/saude`}>Saúde</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/whatsapp`}>WhatsApp Cloud API</a>
      <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cozinha`}>Cozinha</a>
      {session!.user.role === "admin" && <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/entregas`}>Gestão de entregas</a>}
      {session!.user.role === "admin" && <a className="button ghost" href={`${import.meta.env.BASE_URL}entregas`}>Visão do entregador</a>}
      {session!.user.role === "admin" && <a className="button ghost" href={`${import.meta.env.BASE_URL}painel/equipe`}>Equipe</a>}
    </div>
  </section>}</AdminGate>;
}

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

function ProductEditor({ product, data, csrf, refresh, setError }: {
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

  return <details className="admin-product" id={product.slug}>
    <summary>
      <span><strong>{product.displayName}</strong><small>{product.descriptiveName}</small></span>
      <span className={product.isPurchasable ? "state-live" : "state-off"}>{product.isPurchasable ? "Disponível" : "Esgotado/pausado"}</span>
    </summary>
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
  </details>;
}

function CreateProduct({ data, csrf, refresh, setError }: any) {
  const [pricingMode, setPricingMode] = useState<"fixed" | "variants">("fixed");
  const [configurationType, setConfigurationType] = useState<"fixed" | "lilymix">("fixed");
  const [fixedPrice, setFixedPrice] = useState("15,00");
  const [fixedCompareAtPrice, setFixedCompareAtPrice] = useState("");
  const [variants, setVariants] = useState<Array<{ name: string; price: string; compareAtPrice: string }>>([
    { name: "Opção 1", price: "15,00", compareAtPrice: "" }
  ]);
  const [defaultVariant, setDefaultVariant] = useState(0);
  const [busy, setBusy] = useState(false);

  function updateVariant(index: number, field: "name" | "price" | "compareAtPrice", value: string) {
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setBusy(true);
    try {
      let options: Array<{ name: string; price: string; compareAtPrice: string; sizeMl: number; sortOrder: number }>;
      if (configurationType === "lilymix") {
        options = [
          { name: "300 ml", price: String(form.get("price300") || "15,00"), compareAtPrice: String(form.get("compare300") || ""), sizeMl: 300, sortOrder: 10 },
          { name: "500 ml", price: String(form.get("price500") || "22,00"), compareAtPrice: String(form.get("compare500") || ""), sizeMl: 500, sortOrder: 20 }
        ];
      } else if (pricingMode === "fixed") {
        options = [{ name: "Preço fixo", price: fixedPrice, compareAtPrice: fixedCompareAtPrice, sizeMl: 1_000_000_000, sortOrder: 0 }];
      } else {
        const valid = variants.map((variant) => ({ ...variant, name: variant.name.trim() }));
        if (!valid.length || valid.some((variant) => !variant.name)) {
          throw new Error("Informe um nome para cada opção ou remova a linha vazia.");
        }
        options = valid.map((variant, index) => ({
          ...variant,
          sizeMl: 1_000_000_000 + index,
          sortOrder: index === defaultVariant ? 0 : index + 10
        }));
      }
      if (options.some((option) => !option.price.trim() || parseMoney(option.price) <= 0)) {
        throw new Error("Informe um preço maior que zero para cada opção.");
      }
      if (options.some((option) => option.compareAtPrice.trim() && parseMoney(option.compareAtPrice) <= parseMoney(option.price))) {
        throw new Error("O preço antigo deve ser maior que o preço atual.");
      }

      const product = await lilyAdminJson<any>("products", "POST", csrf, {
        categoryId: String(form.get("categoryId")),
        slug: String(form.get("slug")),
        displayName: String(form.get("displayName")),
        descriptiveName: String(form.get("descriptiveName") || "") || null,
        description: String(form.get("description") || "") || null,
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        configurationType,
        status: "draft",
        isAvailable: false,
        featured: false,
        weeklyHighlight: false,
        allowPlaceholder: true,
        sortOrder: 500
      });

      for (const option of options) {
        await lilyAdminJson("variants", "POST", csrf, {
          productId: product.id,
          sizeMl: option.sizeMl,
          name: option.name,
          priceCents: parseMoney(option.price),
          compareAtPriceCents: option.compareAtPrice.trim() ? parseMoney(option.compareAtPrice) : null,
          status: "draft",
          isAvailable: false,
          sortOrder: option.sortOrder
        });
      }
      if (configurationType === "lilymix") {
        await lilyAdminJson(`products/${product.id}/mix-tiers`, "PUT", csrf, { tiers: options.flatMap((option) => [1, 2, 3].map((flavorCount) => ({
          sizeMl: option.sizeMl, flavorCount, priceCents: parseMoney(option.price),
          compareAtPriceCents: option.compareAtPrice.trim() ? parseMoney(option.compareAtPrice) : null, status: "published"
        }))) });
      }
      formElement.reset();
      setPricingMode("fixed");
      setConfigurationType("fixed");
      setFixedPrice("15,00");
      setFixedCompareAtPrice("");
      setVariants([{ name: "Opção 1", price: "15,00", compareAtPrice: "" }]);
      setDefaultVariant(0);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar produto.");
    } finally {
      setBusy(false);
    }
  }

  return <details className="admin-create">
    <summary>+ Novo produto</summary>
    <form className="admin-form-grid" onSubmit={submit}>
      <label>Nome<input name="displayName" required /></label>
      <label>Slug<input name="slug" placeholder="novo-produto" required /></label>
      <label>Nome descritivo<input name="descriptiveName" /></label>
      <label>Categoria<select name="categoryId">{data.categories.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Tipo<select name="configurationType" value={configurationType} onChange={(event) => setConfigurationType(event.target.value === "lilymix" ? "lilymix" : "fixed")}><option value="fixed">Produto fixo</option><option value="lilymix">LilyMix</option></select></label>
      <label>Tags<input name="tags" placeholder="morango, novidade" /></label>
      {configurationType === "lilymix" ? <>
        <label>Preço 300 ml<input name="price300" inputMode="decimal" defaultValue="15,00" /></label>
        <label>Preço antigo 300 ml<input name="compare300" inputMode="decimal" placeholder="Opcional" /></label>
        <label>Preço 500 ml<input name="price500" inputMode="decimal" defaultValue="22,00" /></label>
        <label>Preço antigo 500 ml<input name="compare500" inputMode="decimal" placeholder="Opcional" /></label>
      </> : <div className="admin-span">
        <h4>Preço do produto</h4>
        <label className="toggle"><input type="radio" name="pricingMode" checked={pricingMode === "fixed"} onChange={() => setPricingMode("fixed")} /> Preço fixo (sem variações)</label>
        <label className="toggle"><input type="radio" name="pricingMode" checked={pricingMode === "variants"} onChange={() => setPricingMode("variants")} /> Criar variações personalizadas</label>
        {pricingMode === "fixed" ? <><label>Preço fixo<input value={fixedPrice} onChange={(event) => setFixedPrice(event.target.value)} inputMode="decimal" required /></label><label>Preço antigo (opcional)<input value={fixedCompareAtPrice} onChange={(event) => setFixedCompareAtPrice(event.target.value)} inputMode="decimal" /></label></> : <>
          <div className="variant-admin">
            {variants.map((variant, index) => <div className="variant-row" key={index}>
              <label>Nome da opção<input value={variant.name} maxLength={80} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="Ex.: Fatia, Unidade, Caixa com 6" required /></label>
              <label>Preço<input value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} inputMode="decimal" required /></label>
              <label>Preço antigo (opcional)<input value={variant.compareAtPrice} onChange={(event) => updateVariant(index, "compareAtPrice", event.target.value)} inputMode="decimal" /></label>
              <label className="toggle"><input type="radio" name="defaultVariant" checked={defaultVariant === index} onChange={() => setDefaultVariant(index)} /> Padrão</label>
              <button className="button ghost" type="button" disabled={variants.length <= 1} onClick={() => {
                setVariants((current) => current.filter((_, i) => i !== index));
                setDefaultVariant((current) => current > index ? current - 1 : current === index ? Math.max(0, index - 1) : current);
              }}>Remover</button>
            </div>)}
          </div>
          <button className="button ghost" type="button" onClick={() => setVariants((current) => [...current, { name: `Opção ${current.length + 1}`, price: "", compareAtPrice: "" }])}>+ Adicionar variação</button>
          <small>Você define o nome e o preço de cada opção e escolhe qual começa selecionada.</small>
        </>}
      </div>}
      <label className="admin-span">Descrição<textarea name="description" rows={3} /></label>
      <button className="button primary" type="submit" disabled={busy}>{busy ? "Criando..." : "Criar como rascunho"}</button>
    </form>
  </details>;
}
function CategoryEditor({ data, csrf, refresh, setError }: any) {
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await lilyAdminJson("categories", "POST", csrf, {
        parentId: String(form.get("parentId") || "") || null,
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        status: "draft",
        sortOrder: 500,
        isComingSoon: false
      });
      formElement.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar categoria."); }
  }

  return <details className="admin-create">
    <summary>Categorias</summary>
    <div className="simple-admin-list">
      {data.categories.map((category: any) => <form key={category.id} onChange={(event) => queueAdminFormSave(event.currentTarget)} onSubmit={async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        setFormAutosaveStatus(formElement, "Salvando automaticamente…", "saving");
        const form = new FormData(formElement);
        try {
          await lilyAdminJson(`categories/${category.id}`, "PATCH", csrf, {
            name: String(form.get("name")),
            status: String(form.get("status")),
            sortOrder: Number(form.get("sortOrder")),
            isComingSoon: form.get("coming") === "on"
          }, true);
          setFormAutosaveStatus(formElement, "Alterações salvas", "saved");
        } catch (cause) { setFormAutosaveStatus(formElement, "Falha ao salvar. Edite novamente para tentar.", "error"); setError(cause instanceof Error ? cause.message : "Falha ao editar categoria."); }
      }}>
        <input name="name" defaultValue={category.name} />
        <select name="status" defaultValue={category.status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select>
        <input name="sortOrder" type="number" defaultValue={category.sortOrder} />
        <label className="toggle"><input name="coming" type="checkbox" defaultChecked={category.isComingSoon} /> Em breve</label>
        <small className="admin-autosave-status" data-autosave-status role="status">Alterações salvas</small>
      </form>)}
    </div>
    <form className="admin-form-grid compact" onSubmit={create}>
      <label>Nova categoria<input name="name" required /></label>
      <label>Slug<input name="slug" required /></label>
      <label>Categoria pai<select name="parentId"><option value="">Nenhuma</option>{data.categories.filter((category: any) => !category.parentId).map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button className="button primary" type="submit">Criar rascunho</button>
    </form>
  </details>;
}

function FlavorAddonEditor({ data, csrf, refresh, setError }: any) {
  async function createFlavor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await lilyAdminJson("flavors", "POST", csrf, {
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        status: "published",
        premium: false,
        tags: [],
        portion300: Number(form.get("portion300")),
        portion500: Number(form.get("portion500")),
        priceModifier300: parseMoney(String(form.get("modifier300") || "0")),
        priceModifier500: parseMoney(String(form.get("modifier500") || "0"))
      });
      formElement.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar sabor."); }
  }

  async function createAddon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await lilyAdminJson("addons", "POST", csrf, {
        flavorId: String(form.get("flavorId") || "") || null,
        slug: String(form.get("slug")),
        name: String(form.get("name")),
        priceCents: parseMoney(String(form.get("price"))),
        portion300: Number(form.get("portion300")),
        portion500: Number(form.get("portion500")),
        individualLimit: 2,
        status: "published"
      });
      formElement.reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar adicional."); }
  }

  const compatibility = useMemo(() => new Set(
    data.compatibilities.filter((item: any) => item.isCompatible).map((item: any) => `${item.flavorAId}:${item.flavorBId}`)
  ), [data.compatibilities]);

  return <div className="admin-split">
    <details className="admin-create">
      <summary>Sabores e compatibilidade</summary>
      <form className="admin-form-grid compact" onSubmit={createFlavor}>
        <label>Nome<input name="name" required /></label><label>Slug<input name="slug" required /></label>
        <label>Porção 300g/ml<input name="portion300" type="number" required /></label><label>Porção 500g/ml<input name="portion500" type="number" required /></label>
        <label>Adicional preço 300<input name="modifier300" defaultValue="0" /></label><label>Adicional preço 500<input name="modifier500" defaultValue="0" /></label>
        <button className="button primary" type="submit">Criar sabor</button>
      </form>
      <div className="admin-allergen-component-list">
        <h4>Revisão de alergênicos dos sabores</h4>
        {data.flavors.map((flavor: any) => <ComponentAllergenEditor
          key={flavor.id}
          endpoint="flavors"
          item={flavor}
          catalog={data.allergenCatalog ?? []}
          csrf={csrf}
        />)}
      </div>
      <div className="compatibility-matrix">
        {data.flavors.map((a: any) => <div className="compat-row" key={a.id}>
          <strong>{a.name}</strong>
          <div>{data.flavors.filter((b: any) => b.id !== a.id).map((b: any) => {
            const checked = compatibility.has(`${a.id}:${b.id}`);
            return <label key={b.id}><input type="checkbox" checked={checked} onChange={async (event) => {
              try {
                await lilyAdminJson("compatibilities", "PUT", csrf, { flavorAId: a.id, flavorBId: b.id, isCompatible: event.target.checked }, true);
              } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao mudar compatibilidade."); }
            }} /> {b.name}</label>;
          })}</div>
        </div>)}
      </div>
    </details>
    <details className="admin-create">
      <summary>Adicionais</summary>
      <div className="simple-admin-list">
        {data.addons.map((addon: any) => <form key={addon.id} onChange={(event) => queueAdminFormSave(event.currentTarget)} onSubmit={async (event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          setFormAutosaveStatus(formElement, "Salvando automaticamente…", "saving");
          const form = new FormData(formElement);
          try {
            await lilyAdminJson(`addons/${addon.id}`, "PATCH", csrf, {
              name: String(form.get("name")),
              priceCents: parseMoney(String(form.get("price"))),
              status: String(form.get("status"))
            }, true);
            setFormAutosaveStatus(formElement, "Alterações salvas", "saved");
          } catch (cause) { setFormAutosaveStatus(formElement, "Falha ao salvar. Edite novamente para tentar.", "error"); setError(cause instanceof Error ? cause.message : "Falha ao editar adicional."); }
        }}>
          <input name="name" defaultValue={addon.name} />
          <input name="price" defaultValue={moneyInput(addon.priceCents)} />
          <select name="status" defaultValue={addon.status}><option value="published">Publicado</option><option value="paused">Pausado</option><option value="draft">Rascunho</option></select>
          <small className="admin-autosave-status" data-autosave-status role="status">Alterações salvas</small>
        </form>)}
      </div>
      <div className="admin-allergen-component-list">
        <h4>Revisão de alergênicos dos adicionais</h4>
        {data.addons.map((addon: any) => <ComponentAllergenEditor
          key={addon.id}
          endpoint="addons"
          item={addon}
          catalog={data.allergenCatalog ?? []}
          csrf={csrf}
        />)}
      </div>
      <form className="admin-form-grid compact" onSubmit={createAddon}>
        <label>Nome<input name="name" required /></label><label>Slug<input name="slug" required /></label>
        <label>Sabor relacionado<select name="flavorId"><option value="">Nenhum</option>{data.flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}</select></label>
        <label>Preço<input name="price" required /></label>
        <label>Porção 300<input name="portion300" type="number" required /></label><label>Porção 500<input name="portion500" type="number" required /></label>
        <button className="button primary" type="submit">Criar adicional</button>
      </form>
    </details>
  </div>;
}


function CommercialEditor({ data, csrf, refresh, setError }: any) {
  async function saveCombo(event: FormEvent<HTMLFormElement>, combo: any) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormAutosaveStatus(formElement, "Salvando automaticamente…", "saving");
    const form = new FormData(formElement);
    const mode = String(form.get("mode") || "preset");
    const quantity = Math.min(5, Math.max(1, Number(form.get("quantity") || 1)));

    const presetSelections = Array.from({ length: quantity }, (_, index) => {
      const productId = String(form.get(`presetProduct-${index}`) || "");
      const selectedProduct = data.products.find((product: any) => product.id === productId);
      const requestedSize = Number(form.get(`presetSize-${index}`) || 0);
      const fallbackSize = selectedProduct?.rawVariants?.find((variant: any) => variant.isAvailable)?.sizeMl
        ?? selectedProduct?.rawVariants?.[0]?.sizeMl
        ?? Number(combo.rules?.sizeMl || 300);
      const flavorIds = form.getAll(`presetFlavor-${index}`).map(String).filter(Boolean);
      return {
        productId,
        sizeMl: requestedSize || fallbackSize,
        flavorIds,
        addons: []
      };
    }).filter((selection) => selection.productId);

    if (mode === "preset" && presetSelections.length !== quantity) {
      setError("Escolha um produto para cada item do combo pronto.");
      return;
    }

    const builderSizeRaw = Number(form.get("builderSize") || 0);
    const builderFlavorCountRaw = Number(form.get("builderFlavorCount") || 0);
    const rules = {
      ...(combo.rules ?? {}),
      mode,
      quantity,
      coverProductId: String(form.get("coverProductId") || "") || null,
      presetSelections: mode === "preset"
        ? presetSelections
        : (Array.isArray(combo.rules?.presetSelections) ? combo.rules.presetSelections : []),
      category: String(form.get("builderCategory") || "") || null,
      subtype: String(form.get("builderSubtype") || "") || null,
      sizeMl: builderSizeRaw || null,
      flavorCount: builderFlavorCountRaw || null
    };

    try {
      await lilyAdminJson(`combos/${combo.id}`, "PATCH", csrf, {
        name: String(form.get("name")),
        description: String(form.get("description") || "") || null,
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status")),
        featured: form.get("featured") === "on",
        rules
      }, true);
      setFormAutosaveStatus(formElement, "Alterações salvas", "saved");
    } catch (cause) {
      setFormAutosaveStatus(formElement, "Falha ao salvar. Edite novamente para tentar.", "error");
      setError(cause instanceof Error ? cause.message : "Falha ao salvar combo.");
    }
  }

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const productId = String(form.get("productId"));
    const variantId = String(form.get("variantId") || "") || null;
    try {
      await lilyAdminJson("offers", "POST", csrf, {
        productId,
        variantId,
        name: String(form.get("name")),
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status") || "draft"),
        campaignId: String(form.get("campaignId") || "") || null,
        minProjectedMarginBps: 1000
      });
      formElement.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar oferta.");
    }
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>, offer: any) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormAutosaveStatus(formElement, "Salvando automaticamente…", "saving");
    const form = new FormData(formElement);
    try {
      await lilyAdminJson(`offers/${offer.id}`, "PATCH", csrf, {
        name: String(form.get("name")),
        regularPriceCents: parseMoney(String(form.get("regular"))),
        offerPriceCents: parseMoney(String(form.get("offer"))),
        status: String(form.get("status")),
        campaignId: String(form.get("campaignId") || "") || null
      }, true);
      setFormAutosaveStatus(formElement, "Alterações salvas", "saved");
    } catch (cause) {
      setFormAutosaveStatus(formElement, "Falha ao salvar. Edite novamente para tentar.", "error");
      setError(cause instanceof Error ? cause.message : "Falha ao salvar oferta.");
    }
  }

  const selectedProductForOffer = data.products[0];
  const rootCategories = data.categories.filter((category: any) => !category.parentId);

  return <details className="admin-create">
    <summary>Ofertas e combos</summary>
    <div className="commercial-admin">
      <section>
        <h4>Combos</h4>
        <p>O modo <strong>Sabores selecionados</strong> é o padrão comercial. O modo <strong>Cliente monta</strong> permanece disponível e pode ser ativado a qualquer momento.</p>
        <div className="combo-admin-list">
          {data.combos.map((combo: any) => {
            const rules = combo.rules ?? {};
            const configuredPresetSelections = Array.isArray(rules.presetSelections) ? rules.presetSelections : [];
            const presetSelections = configuredPresetSelections.length
              ? configuredPresetSelections
              : (Array.isArray(combo.resolvedPresetSelections) ? combo.resolvedPresetSelections : []);
            const quantity = Math.min(5, Math.max(1, Number(rules.quantity || presetSelections.length || 1)));
            const mode = rules.mode === "builder" ? "builder" : "preset";
            return <form className="combo-admin-card" key={combo.id} onChange={(event) => queueAdminFormSave(event.currentTarget)} onSubmit={(event) => void saveCombo(event, combo)}>
              <div className="combo-admin-main">
                <label>Nome<input name="name" defaultValue={combo.name} /></label>
                <label>Descrição<input name="description" defaultValue={combo.description ?? ""} /></label>
                <label>Preço regular<input name="regular" defaultValue={moneyInput(combo.regularPriceCents)} /></label>
                <label>Preço do combo<input name="offer" defaultValue={moneyInput(combo.offerPriceCents)} /></label>
                <label>Modo
                  <select name="mode" defaultValue={mode}>
                    <option value="preset">Sabores selecionados</option>
                    <option value="builder">Cliente monta</option>
                  </select>
                </label>
                <label>Quantidade de itens<input name="quantity" type="number" min="1" max="5" defaultValue={quantity} /></label>
                <label>Status<select name="status" defaultValue={combo.status}>
                  <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option>
                </select></label>
                <label className="toggle"><input name="featured" type="checkbox" defaultChecked={combo.featured} /> Destaque</label>
                <label className="combo-admin-cover">Produto usado como capa
                  <select name="coverProductId" defaultValue={rules.coverProductId ?? presetSelections[0]?.productId ?? ""}>
                    <option value="">Primeiro produto do combo</option>
                    {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
                  </select>
                </label>
              </div>

              <details className="combo-admin-mode" open={mode === "preset"}>
                <summary>Configuração do combo pronto</summary>
                <p>Somente os primeiros itens definidos em “Quantidade de itens” serão enviados. Em produto fixo, você pode deixar sabores sem seleção para usar os sabores próprios do produto. Em LilyMix, selecione de 1 a 3 sabores.</p>
                <div className="combo-preset-slots">
                  {Array.from({ length: 5 }, (_, index) => {
                    const selection = presetSelections[index] ?? {};
                    return <fieldset key={index}>
                      <legend>Item {index + 1}{index >= quantity ? " · reserva" : ""}</legend>
                      <label>Produto
                        <select name={`presetProduct-${index}`} defaultValue={selection.productId ?? ""}>
                          <option value="">Selecione</option>
                          {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
                        </select>
                      </label>
                      <label>Tamanho (ml)
                        <input name={`presetSize-${index}`} type="number" min="100" max="5000" defaultValue={selection.sizeMl ?? rules.sizeMl ?? 300} />
                      </label>
                      <label>Sabores
                        <select name={`presetFlavor-${index}`} multiple size={4} defaultValue={Array.isArray(selection.flavorIds) ? selection.flavorIds : []}>
                          {data.flavors.map((flavor: any) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
                        </select>
                      </label>
                    </fieldset>;
                  })}
                </div>
              </details>

              <details className="combo-admin-mode" open={mode === "builder"}>
                <summary>Regras do modo “Cliente monta”</summary>
                <div className="combo-builder-rules">
                  <label>Categoria
                    <select name="builderCategory" defaultValue={rules.category ?? ""}>
                      <option value="">Qualquer categoria</option>
                      {rootCategories.map((category: any) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                    </select>
                  </label>
                  <label>Subtipo
                    <select name="builderSubtype" defaultValue={rules.subtype ?? ""}>
                      <option value="">Qualquer</option>
                      <option value="simple">Somente simples</option>
                    </select>
                  </label>
                  <label>Tamanho (ml)<input name="builderSize" type="number" min="100" max="5000" defaultValue={rules.sizeMl ?? 300} /></label>
                  <label>Quantidade de sabores<input name="builderFlavorCount" type="number" min="1" max="3" defaultValue={rules.flavorCount ?? 1} /></label>
                </div>
              </details>

              <div className="combo-admin-actions">
                <small>Modo atual: <strong>{mode === "preset" ? "sabores selecionados" : "cliente monta"}</strong></small>
                <small className="admin-autosave-status" data-autosave-status role="status">Alterações salvas</small>
              </div>
            </form>;
          })}
        </div>
      </section>

      <section>
        <h4>Ofertas de produto</h4>
        {data.offers.length > 0 && <div className="simple-admin-list commercial-list offers-list">
          {data.offers.map((offer: any) => <form key={offer.id} onChange={(event) => queueAdminFormSave(event.currentTarget)} onSubmit={(event) => void saveOffer(event, offer)}>
            <input name="name" defaultValue={offer.name} aria-label="Nome da oferta" />
            <input name="regular" defaultValue={moneyInput(offer.regularPriceCents)} aria-label="Preço regular" />
            <input name="offer" defaultValue={moneyInput(offer.offerPriceCents)} aria-label="Preço oferta" />
            <input name="campaignId" defaultValue={offer.campaignId ?? ""} placeholder="campanha" />
            <select name="status" defaultValue={offer.status}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select>
            <small className="admin-autosave-status" data-autosave-status role="status">Alterações salvas</small>
          </form>)}
        </div>}

        <form className="admin-form-grid compact offer-create" onSubmit={createOffer}>
          <label>Nome<input name="name" placeholder="Oferta de lançamento" required /></label>
          <label>Produto<select name="productId" defaultValue={selectedProductForOffer?.id ?? ""} required>
            {data.products.map((product: any) => <option key={product.id} value={product.id}>{product.displayName}</option>)}
          </select></label>
          <label>Variante opcional<select name="variantId">
            <option value="">Produto inteiro</option>
            {data.products.flatMap((product: any) => product.rawVariants.map((variant: any) =>
              <option key={variant.id} value={variant.id}>{product.displayName} · {variant.sizeMl} ml</option>
            ))}
          </select></label>
          <label>Preço regular<input name="regular" inputMode="decimal" required /></label>
          <label>Preço oferta<input name="offer" inputMode="decimal" required /></label>
          <label>Campanha<input name="campaignId" placeholder="lancamento" /></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
          <button className="button primary" type="submit">Criar oferta</button>
        </form>
      </section>
    </div>
  </details>;
}

export function AdminCatalog() {
  return <AdminGate>{({ data, session, error, refresh, setError }) => <section className="admin-page wide">
    <div className="admin-heading">
      <div><span className="eyebrow">Entrega 05</span><h1>Cardápio administrável</h1><p>Alterações publicadas refletem no cardápio sem rebuild.</p></div>
      <div className="admin-actions"><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Resumo</a><a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Preview</a></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <CreateProduct data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CategoryEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <FlavorAddonEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CommercialEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <div className="admin-product-list">
      {data!.products.map((product: any) => <ProductEditor key={product.id} product={product} data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />)}
    </div>
  </section>}</AdminGate>;
}

export function AdminMedia() {
  return <AdminGate>{({ data, session, error, refresh, setError }) => {
    async function upload(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
    const formElement = event.currentTarget;
    const input = formElement.elements.namedItem("file") as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadLilyMedia(file, session!.csrfToken);
        formElement.reset();
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha no upload.");
      }
    }
    return <section className="admin-page">
      <div className="admin-heading"><div><span className="eyebrow">Mídia CookLily</span><h1>Fotos do catálogo</h1><p>JPEG, PNG ou WebP. Até 10 MB.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Voltar ao cardápio</a></div>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="media-upload" onSubmit={upload}><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="button primary" type="submit">Enviar imagem</button></form>
      <div className="media-grid">
        {data!.media.map((media: any) => <article key={media.id}>
          <img src={`/api/v1/lily/public/media/${media.id}`} alt={media.altText} />
          <strong>{media.originalName}</strong><small>{Math.round(media.size / 1024)} KB · {media.mime}</small>
        </article>)}
      </div>
    </section>;
  }}</AdminGate>;
}
