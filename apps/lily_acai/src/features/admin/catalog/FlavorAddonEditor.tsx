import { useMemo, type FormEvent } from "react";
import { lilyAdminJson } from "../../../api";
import { queueAdminFormSave, setFormAutosaveStatus } from "../admin-form-autosave";
import { ComponentAllergenEditor } from "../ComponentAllergenEditor";
import { moneyInput, parseMoney } from "./product-money";

export function FlavorAddonEditor({ data, csrf, refresh, setError }: any) {
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
