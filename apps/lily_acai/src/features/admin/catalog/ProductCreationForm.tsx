import { useState, type FormEvent } from "react";
import { lilyAdminJson } from "../../../api";
import { parseMoney } from "./product-money";

export function CreateProduct({ data, csrf, refresh, setError }: any) {
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
