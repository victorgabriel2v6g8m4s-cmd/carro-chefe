export type AdminAllergenValue = {
  reviewStatus: "unreviewed" | "reviewed";
  contains: string[];
  mayContain: string[];
};

export function normalizeAdminAllergens(input: any): AdminAllergenValue {
  return {
    reviewStatus: input?.reviewStatus === "reviewed" ? "reviewed" : "unreviewed",
    contains: Array.isArray(input?.contains) ? input.contains.map(String) : [],
    mayContain: Array.isArray(input?.mayContain) ? input.mayContain.map(String) : []
  };
}

function selectedValues(target: HTMLSelectElement) {
  return Array.from(target.selectedOptions).map((option) => option.value);
}

export function allergenPayload(value: AdminAllergenValue) {
  return {
    allergenReviewStatus: value.reviewStatus,
    allergenContains: value.contains,
    allergenMayContain: value.mayContain
  };
}

export function AllergenAdminFields(props: {
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
      <select multiple size={5} value={props.value.contains} onChange={(event) => props.onChange({ ...props.value, contains: selectedValues(event.target) })}>
        {props.catalog.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    <label>PODE CONTER
      <select multiple size={5} value={props.value.mayContain} onChange={(event) => props.onChange({ ...props.value, mayContain: selectedValues(event.target) })}>
        {props.catalog.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    <small>“Pendente de revisão” nunca é tratado como ausência de alergênicos. Não selecione o mesmo item em CONTÉM e PODE CONTER.</small>
  </fieldset>;
}
