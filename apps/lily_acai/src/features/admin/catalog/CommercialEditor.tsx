import type { FormEvent } from "react";
import { lilyAdminJson } from "../../../api";
import { queueAdminFormSave, setFormAutosaveStatus } from "../admin-form-autosave";
import { moneyInput, parseMoney } from "./product-money";

export function CommercialEditor({ data, csrf, refresh, setError }: any) {
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
