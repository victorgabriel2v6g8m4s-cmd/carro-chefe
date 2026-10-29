import { useEffect, useMemo, useRef, useState } from "react";
import type { LilyBenefit } from "../../api";
import type { LoyaltyBenefitCatalog, LoyaltyCatalogCombo, LoyaltyCatalogProduct } from "./loyalty-types";

type BenefitGroup = { id: string; name: string; kind: LilyBenefit["kind"]; items: Array<{ id: string; label: string; description: string; product?: LoyaltyCatalogProduct }> };

function createGroups(catalog: LoyaltyBenefitCatalog): BenefitGroup[] {
  const productsByCategory = catalog.categories.map((category) => ({
    id: `products:${category.id}`, name: category.name, kind: "product" as const,
    items: catalog.products.filter((product) => product.categoryId === category.id).map((product) => ({ id: product.id, label: product.displayName, description: category.name, product }))
  }));
  return [...productsByCategory,
    { id: "coupons", name: "Cupons", kind: "coupon", items: catalog.coupons.map((item) => ({ id: item.id, label: item.title, description: item.code })) },
    { id: "discounts", name: "Descontos", kind: "discount", items: catalog.discounts.map((item) => ({ id: item.id, label: item.title, description: `${item.value}${item.type.toLowerCase().includes("percent") ? "%" : "¢"}` })) },
    { id: "offers", name: "Ofertas", kind: "offer", items: catalog.offers.map((item) => ({ id: item.id, label: item.name, description: "Oferta publicada" })) },
    { id: "combos", name: "Combos", kind: "combo", items: catalog.combos.map((item) => ({ id: item.id, label: item.name, description: item.description ?? `${item.items.length} itens` })) },
    { id: "user-classes", name: "Classes de usuário", kind: "user_class", items: catalog.userClasses.map((item) => ({ id: item.id, label: item.name, description: item.description })) }
  ];
}

function emptyConfiguration() { return { variantIds: [] as string[], flavorIds: [] as string[], addonIds: [] as string[] }; }

export function LoyaltyBenefitPicker({ benefits, catalog, onChange }: { benefits: LilyBenefit[]; catalog: LoyaltyBenefitCatalog; onChange: (benefits: LilyBenefit[]) => void }) {
  const groups = useMemo(() => createGroups(catalog), [catalog]);
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [configuring, setConfiguring] = useState<LoyaltyCatalogProduct | null>(null);
  const [configuringCombo, setConfiguringCombo] = useState<LoyaltyCatalogCombo | null>(null);
  const [comboConfiguration, setComboConfiguration] = useState<NonNullable<LilyBenefit["configuration"]["comboItems"]>>([]);
  const [configuration, setConfiguration] = useState(emptyConfiguration);
  const [selectionError, setSelectionError] = useState("");
  const clickTimer = useRef<number | null>(null);
  const currentGroup = groups.find((group) => group.id === categoryId) ?? groups[0];
  const selectedKeys = new Set(benefits.map(({ kind, entityId }) => `${kind}:${entityId}`));
  const visibleItems = (currentGroup?.items ?? []).filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));

  useEffect(() => { if (!categoryId && groups.length) setCategoryId(groups[0].id); }, [categoryId, groups]);
  useEffect(() => () => { if (clickTimer.current !== null) window.clearTimeout(clickTimer.current); }, []);

  function selectItem(group: BenefitGroup, item: BenefitGroup["items"][number]) {
    const key = `${group.kind}:${item.id}`;
    if (selectedKeys.has(key)) {
      onChange(benefits.filter((benefit) => `${benefit.kind}:${benefit.entityId}` !== key));
      return;
    }
    onChange([...benefits, { id: key, kind: group.kind, entityId: item.id, label: item.label, categoryId: group.kind === "product" ? group.id.replace("products:", "") : null, maxRedemptionsPerUser: 1, selectionMode: "customer_choice", configuration: emptyConfiguration() }]);
  }

  function openProductConfiguration(product: LoyaltyCatalogProduct) {
    const existing = benefits.find((benefit) => benefit.kind === "product" && benefit.entityId === product.id);
    setConfiguration(existing?.configuration ?? emptyConfiguration());
    setSelectionError("");
    setConfiguring(product);
  }

  function openComboConfiguration(combo: LoyaltyCatalogCombo) {
    const existing = benefits.find((benefit) => benefit.kind === "combo" && benefit.entityId === combo.id);
    setComboConfiguration(combo.items.map((item) => existing?.configuration.comboItems?.find((chosen) => chosen.comboItemId === item.id) ?? { comboItemId: item.id, variantIds: [], flavorIds: [], addonIds: [] }));
    setSelectionError("");
    setConfiguringCombo(combo);
  }

  function saveProductConfiguration() {
    if (!configuring) return;
    if (configuring.variants.length && configuration.variantIds.length !== 1) {
      setSelectionError("Escolha um tamanho para montar uma combinação fixa.");
      return;
    }
    if (configuration.addonIds.length < configuring.minimumAddonUnits) {
      setSelectionError(`Esta combinação precisa incluir ao menos ${configuring.minimumAddonUnits} adicionais.`);
      return;
    }
    if (configuring.maximumAddonUnits > 0 && configuration.addonIds.length > configuring.maximumAddonUnits) {
      setSelectionError(`Esta combinação permite até ${configuring.maximumAddonUnits} adicionais.`);
      return;
    }
    const key = `product:${configuring.id}`;
    const selected = benefits.find((benefit) => `${benefit.kind}:${benefit.entityId}` === key);
    const benefit: LilyBenefit = { ...selected, id: key, kind: "product", entityId: configuring.id, label: configuring.displayName, categoryId: configuring.categoryId, maxRedemptionsPerUser: selected?.maxRedemptionsPerUser ?? 1, selectionMode: "preset", configuration };
    onChange(selected ? benefits.map((item) => item.id === selected.id ? benefit : item) : [...benefits, benefit]);
    setConfiguring(null);
  }

  function saveComboConfiguration() {
    if (!configuringCombo) return;
    const invalid = configuringCombo.items.find((item) => {
      const chosen = comboConfiguration.find((entry) => entry.comboItemId === item.id);
      return !chosen || item.product.variants.length > 0 && chosen.variantIds.length !== 1 || chosen.addonIds.length < item.product.minimumAddonUnits || item.product.maximumAddonUnits > 0 && chosen.addonIds.length > item.product.maximumAddonUnits;
    });
    if (invalid) { setSelectionError(`Revise o tamanho e a quantidade de adicionais de “${invalid.product.displayName}”.`); return; }
    const key = `combo:${configuringCombo.id}`;
    const selected = benefits.find((benefit) => `${benefit.kind}:${benefit.entityId}` === key);
    const benefit: LilyBenefit = { ...selected, id: key, kind: "combo", entityId: configuringCombo.id, label: configuringCombo.name, categoryId: null, maxRedemptionsPerUser: selected?.maxRedemptionsPerUser ?? 1, selectionMode: "preset", configuration: { variantIds: [], flavorIds: [], addonIds: [], comboItems: comboConfiguration } };
    onChange(selected ? benefits.map((item) => item.id === selected.id ? benefit : item) : [...benefits, benefit]);
    setConfiguringCombo(null);
  }

  function toggleComboOption(itemId: string, field: "flavorIds" | "addonIds", optionId: string, checked: boolean) {
    setComboConfiguration((current) => current.map((item) => item.comboItemId !== itemId ? item : { ...item, [field]: checked ? [...item[field], optionId] : item[field].filter((id) => id !== optionId) }));
  }

  return <div className="loyalty-benefit-picker">
    <div className="loyalty-benefit-list" aria-label="Benefícios selecionados">
      {benefits.map((benefit) => <article key={benefit.id} className="loyalty-benefit-chip">
        <span><strong>{benefit.label}</strong><small>{benefit.selectionMode === "preset" ? "Combinação montada" : "Cliente escolhe as variações"}</small></span>
        <label className="loyalty-benefit-limit">Resgates por cliente<input type="number" min="1" max="100" value={benefit.maxRedemptionsPerUser} onChange={(event) => { const limit = Math.min(100, Math.max(1, Number(event.target.value) || 1)); onChange(benefits.map((item) => item.id === benefit.id ? { ...item, maxRedemptionsPerUser: limit } : item)); }} /></label>
        {benefit.kind === "product" && <button type="button" className="button ghost" aria-label={`Montar combinação de ${benefit.label}`} onClick={() => { const item = catalog.products.find((product) => product.id === benefit.entityId); if (item) openProductConfiguration(item); }}>Ajustar combinação</button>}
        {benefit.kind === "combo" && <button type="button" className="button ghost" aria-label={`Montar combinação de ${benefit.label}`} onClick={() => { const item = catalog.combos.find((combo) => combo.id === benefit.entityId); if (item) openComboConfiguration(item); }}>Ajustar combinação</button>}
        <button type="button" className="loyalty-benefit-remove" aria-label={`Remover ${benefit.label}`} onClick={() => onChange(benefits.filter((item) => item.id !== benefit.id))}>×</button>
      </article>)}
      {!benefits.length && <p className="muted">Nenhum benefício selecionado para este nível.</p>}
    </div>
    <button className="loyalty-benefit-add" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span aria-hidden="true">+</span> Adicionar benefício</button>
    {open && <section className="loyalty-benefit-menu" aria-label="Selecionar benefício">
      <label className="loyalty-benefit-search">Pesquisar no catálogo<input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produto, cupom, oferta…" /></label>
      <div className="loyalty-benefit-menu-body">
        <nav className="loyalty-benefit-categories" aria-label="Categorias de benefícios">{groups.map((group) => <button type="button" key={group.id} className={group.id === currentGroup?.id ? "selected" : ""} aria-pressed={group.id === currentGroup?.id} onClick={() => setCategoryId(group.id)}>{group.name}<small>{group.items.length}</small></button>)}</nav>
        <div className="loyalty-benefit-items" role="list" aria-label={currentGroup?.name ?? "Itens"}>
          {visibleItems.map((item) => {
            if (!currentGroup) return null;
            const selected = selectedKeys.has(`${currentGroup.kind}:${item.id}`);
            const activate = () => {
              if (currentGroup.kind === "product" && item.product) openProductConfiguration(item.product);
              else if (currentGroup.kind === "combo") { const combo = catalog.combos.find((candidate) => candidate.id === item.id); if (combo) openComboConfiguration(combo); }
              else selectItem(currentGroup, item);
            };
            return <button type="button" key={item.id} className={`loyalty-benefit-option${selected ? " is-selected" : ""}`} aria-pressed={selected} aria-label={`${selected ? "Selecionado" : "Não selecionado"}: ${item.label}. Clique uma vez para alternar; dê dois cliques ou pressione F2 para montar combinação.`}
              onClick={(event) => { if (clickTimer.current !== null) { window.clearTimeout(clickTimer.current); clickTimer.current = null; if (currentGroup.kind === "product" || currentGroup.kind === "combo") activate(); else selectItem(currentGroup, item); return; } if (event.detail > 1) { activate(); return; } clickTimer.current = window.setTimeout(() => { clickTimer.current = null; selectItem(currentGroup, item); }, 240); }}
              onKeyDown={(event) => { if (event.key === "F2" && (currentGroup.kind === "product" || currentGroup.kind === "combo")) { event.preventDefault(); if (clickTimer.current !== null) window.clearTimeout(clickTimer.current); activate(); } }}>
              <span className="loyalty-benefit-check" aria-hidden="true">{selected ? "✓" : ""}</span><span><strong>{item.label}</strong><small>{item.description || "CookLily"}</small></span><span className="loyalty-benefit-option-hint">{currentGroup.kind === "product" ? "2 cliques · montar" : "selecionar"}</span>
            </button>;
          })}
          {!visibleItems.length && <p className="muted">Nenhum item encontrado nesta categoria.</p>}
        </div>
      </div>
      <p className="loyalty-benefit-hint">Um clique alterna a seleção e deixa o cliente escolher. Dois cliques em um produto ou combo, ou F2 após focar, abre as variações para montar uma combinação fixa.</p>
    </section>}
    {configuring && <div className="loyalty-config-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfiguring(null); }}><section className="loyalty-config-dialog" role="dialog" aria-modal="true" aria-labelledby="loyalty-config-title">
      <header><div><span className="eyebrow">Combinação do benefício</span><h3 id="loyalty-config-title">{configuring.displayName}</h3></div><button type="button" className="button ghost" aria-label="Fechar configuração" onClick={() => setConfiguring(null)}>×</button></header>
      <p>Escolha exatamente o tamanho, os sabores e os adicionais incluídos. Os itens disponíveis respeitam as opções cadastradas no produto.</p>
      {!!configuring.variants.length && <fieldset><legend>Tamanho</legend>{configuring.variants.map((variant) => <label key={variant.id}><input type="radio" name="loyalty-variant" checked={configuration.variantIds.includes(variant.id)} onChange={() => setConfiguration((current) => ({ ...current, variantIds: [variant.id] }))} />{variant.name}{variant.sizeMl ? ` · ${variant.sizeMl} ml` : ""}</label>)}</fieldset>}
      {!!configuring.flavorLinks.length && <fieldset><legend>Sabores</legend>{configuring.flavorLinks.map(({ flavor }) => <label key={flavor.id}><input type="checkbox" checked={configuration.flavorIds.includes(flavor.id)} onChange={(event) => setConfiguration((current) => ({ ...current, flavorIds: event.target.checked ? [...current.flavorIds, flavor.id] : current.flavorIds.filter((id) => id !== flavor.id) }))} />{flavor.name}</label>)}</fieldset>}
      {!!configuring.addonLinks.length && <fieldset><legend>Adicionais <small>{configuring.minimumAddonUnits ? `· mínimo ${configuring.minimumAddonUnits}` : "· opcional"}{configuring.maximumAddonUnits ? `, máximo ${configuring.maximumAddonUnits}` : ""}</small></legend>{configuring.addonLinks.map(({ addon }) => <label key={addon.id}><input type="checkbox" checked={configuration.addonIds.includes(addon.id)} onChange={(event) => setConfiguration((current) => ({ ...current, addonIds: event.target.checked ? [...current.addonIds, addon.id] : current.addonIds.filter((id) => id !== addon.id) }))} />{addon.name}</label>)}</fieldset>}
      {selectionError && <p className="error" role="alert">{selectionError}</p>}
      <div className="admin-actions"><button type="button" className="button ghost" onClick={() => setConfiguring(null)}>Cancelar</button><button type="button" className="button primary" onClick={saveProductConfiguration}>Salvar combinação</button></div>
    </section></div>}
    {configuringCombo && <div className="loyalty-config-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfiguringCombo(null); }}><section className="loyalty-config-dialog" role="dialog" aria-modal="true" aria-labelledby="loyalty-combo-config-title">
      <header><div><span className="eyebrow">Combinação do benefício</span><h3 id="loyalty-combo-config-title">{configuringCombo.name}</h3></div><button type="button" className="button ghost" aria-label="Fechar configuração" onClick={() => setConfiguringCombo(null)}>×</button></header>
      <p>Monte o que vem em cada item do combo. Sem esta configuração, o cliente escolhe entre as opções publicadas.</p>
      {configuringCombo.items.map((item) => {
        const chosen = comboConfiguration.find((entry) => entry.comboItemId === item.id) ?? { comboItemId: item.id, variantIds: [], flavorIds: [], addonIds: [] };
        return <fieldset key={item.id}><legend>{item.product.displayName} · {item.quantity} un.</legend>
          {!!item.product.variants.length && <label>Tamanho<select value={chosen.variantIds[0] ?? ""} onChange={(event) => setComboConfiguration((current) => current.map((entry) => entry.comboItemId === item.id ? { ...entry, variantIds: event.target.value ? [event.target.value] : [] } : entry))}><option value="">Escolha um tamanho</option>{item.product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sizeMl ? ` · ${variant.sizeMl} ml` : ""}</option>)}</select></label>}
          {!!item.product.flavorLinks.length && <div className="loyalty-combo-options"><strong>Sabores</strong>{item.product.flavorLinks.map(({ flavor }) => <label key={flavor.id}><input type="checkbox" checked={chosen.flavorIds.includes(flavor.id)} onChange={(event) => toggleComboOption(item.id, "flavorIds", flavor.id, event.target.checked)} />{flavor.name}</label>)}</div>}
          {!!item.product.addonLinks.length && <div className="loyalty-combo-options"><strong>Adicionais <small>{item.product.minimumAddonUnits ? `· mínimo ${item.product.minimumAddonUnits}` : "· opcional"}{item.product.maximumAddonUnits ? `, máximo ${item.product.maximumAddonUnits}` : ""}</small></strong>{item.product.addonLinks.map(({ addon }) => <label key={addon.id}><input type="checkbox" checked={chosen.addonIds.includes(addon.id)} onChange={(event) => toggleComboOption(item.id, "addonIds", addon.id, event.target.checked)} />{addon.name}</label>)}</div>}
        </fieldset>;
      })}
      {selectionError && <p className="error" role="alert">{selectionError}</p>}
      <div className="admin-actions"><button type="button" className="button ghost" onClick={() => setConfiguringCombo(null)}>Cancelar</button><button type="button" className="button primary" onClick={saveComboConfiguration}>Salvar combinação</button></div>
    </section></div>}
  </div>;
}
