import type { FormEvent } from "react";
import { lilyAdminJson } from "../../../api";
import { queueAdminFormSave, setFormAutosaveStatus } from "../admin-form-autosave";

export function CategoryEditor({ data, csrf, refresh, setError }: any) {
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
