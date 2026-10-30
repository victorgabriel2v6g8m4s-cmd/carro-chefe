import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getLilyAdminCatalog, getLilyAdminCatalogIndex, getLilySession, lilyAdminJson, uploadLilyMedia, type AuthPayload } from "./api";
import { LilyLoadingSpinner } from "./loading-spinner";
import { AdminAutosaveStatus, useAdminAutosave } from "./features/admin/useAdminAutosave";
import { AllergenAdminFields, allergenPayload, normalizeAdminAllergens, type AdminAllergenValue } from "./features/admin/AllergenAdminFields";
import { ProductEditor } from "./features/admin/catalog/ProductEditor";
import { moneyInput, parseMoney } from "./features/admin/catalog/product-money";
import type { AdminProductSummary } from "./features/admin/catalog/types";

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

function useAdminData(loadCatalog: boolean | "index") {
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
      if (loadCatalog) setData(loadCatalog === "index" ? await getLilyAdminCatalogIndex() : await getLilyAdminCatalog());
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

export function AdminGate({ children, loadCatalog = false }: {
  children: (state: ReturnType<typeof useAdminData>) => ReactNode;
  loadCatalog?: boolean | "index";
}) {
  const state = useAdminData(loadCatalog);
  if (state.loading) return <section className="admin-state"><LilyLoadingSpinner size="lg" label="Carregando painel"/></section>;
  if (!state.session || (loadCatalog && !state.data)) return <section className="admin-state">
    <span className="eyebrow">Painel CookLily</span>
    <h1>Acesso staff necessário.</h1>
    <p>{state.error || "Entre com uma conta da equipe para administrar o catálogo."}</p>
    <a className="button primary" href={`${import.meta.env.BASE_URL}entrar?next=${encodeURIComponent(window.location.pathname.replace(/^\/lilyacai/, "") || "/painel")}`}>Entrar</a>
  </section>;
  return <>{children(state)}</>;
}

export function AdminHome() {
  return <AdminGate loadCatalog>{({ data, session }) => <section className="admin-page">
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
  </section>}</AdminGate>;
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

function CatalogGlobalSettings({ csrf, refresh, setError }: { csrf: string; refresh: () => Promise<void>; setError: (value: string) => void }) {
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

function ProductCatalogIndex({ products, csrf, refresh, setError }: { products: AdminProductSummary[]; csrf: string; refresh: () => Promise<void>; setError: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const categories = [...new Map(products.map((product) => [product.category.id, product.category])).values()];
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleProducts = products.filter((product) => (!categoryId || product.category.id === categoryId)
    && (!normalizedQuery || `${product.displayName} ${product.descriptiveName ?? ""} ${product.category.name}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)));
  return <>
    <div className="admin-form-grid compact">
      <label>Buscar produto<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou categoria" /></label>
      <label>Categoria<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <small aria-live="polite">{visibleProducts.length} de {products.length} produtos</small>
    </div>
    <div className="catalog-grid admin-product-list">
      {visibleProducts.map((product) => <ProductEditor key={product.id} product={product} csrf={csrf} refresh={refresh} setError={setError} />)}
      {visibleProducts.length === 0 && <p className="admin-empty-state">Nenhum produto corresponde à busca.</p>}
    </div>
  </>;
}

export function AdminCatalog() {
  return <AdminGate loadCatalog="index">{({ data, session, error, refresh, setError }) => <section className="admin-page wide">
    <div className="admin-heading">
      <div><span className="eyebrow">Entrega 05</span><h1>Cardápio administrável</h1><p>Alterações publicadas refletem no cardápio sem rebuild.</p></div>
      <div className="admin-actions"><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Resumo</a><a className="button ghost" href={`${import.meta.env.BASE_URL}cardapio`} target="_blank" rel="noreferrer">Preview</a></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <CreateProduct data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CategoryEditor data={data!} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <CatalogGlobalSettings csrf={session!.csrfToken} refresh={refresh} setError={setError} />
    <ProductCatalogIndex products={data!.products} csrf={session!.csrfToken} refresh={refresh} setError={setError} />
  </section>}</AdminGate>;
}

export function AdminMedia() {
  return <AdminGate loadCatalog>{({ data, session, error, refresh, setError }) => {
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
      <div className="admin-heading"><div><span className="eyebrow">Mídia CookLily</span><h1>Fotos e vídeos do catálogo</h1><p>JPEG, PNG, WebP, MP4 ou WebM. Até 50 MB por arquivo.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel/cardapio`}>Voltar ao cardápio</a></div>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="media-upload" onSubmit={upload}><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required /><button className="button primary" type="submit">Enviar mídia</button></form>
      <div className="media-grid">
        {data!.media.map((media: any) => <article key={media.id}>
          {String(media.mime).startsWith("video/") ? <video src={`/api/v1/lily/public/media/${media.id}`} muted controls preload="metadata" aria-label={media.altText} /> : <img src={`/api/v1/lily/public/media/${media.id}`} alt={media.altText} />}
          <strong>{media.originalName}</strong><small>{Math.round(media.size / 1024)} KB · {media.mime}</small>
        </article>)}
      </div>
    </section>;
  }}</AdminGate>;
}
