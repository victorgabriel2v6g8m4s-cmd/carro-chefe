import { useState } from "react";
import { lilyAdminJson } from "../../api";
import { AdminAutosaveStatus, useAdminAutosave } from "./useAdminAutosave";
import { AllergenAdminFields, allergenPayload, normalizeAdminAllergens, type AdminAllergenValue } from "./AllergenAdminFields";

export function ComponentAllergenEditor(props: {
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
