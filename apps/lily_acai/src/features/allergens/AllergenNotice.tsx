import type { LilyAllergenSummary } from "../../api";

export function AllergenNotice(props: {
  summary: LilyAllergenSummary | null | undefined;
  compact?: boolean;
  heading?: string;
}) {
  const { summary } = props;
  if (!summary) return null;

  const contains = summary.contains.map((item) => item.label);
  const mayContain = summary.mayContain.map((item) => item.label);

  return <aside
    className={"allergen-notice" + (props.compact ? " is-compact" : "") + (!summary.complete ? " is-incomplete" : "")}
    aria-label={props.heading ?? "Informações de alergênicos"}
  >
    <strong>{props.heading ?? "Alergênicos"}</strong>
    {!summary.complete && <p>
      <b>Informação em revisão.</b> Ainda falta confirmar: {summary.unreviewed.join(", ") || "um ou mais componentes"}.
    </p>}
    {contains.length > 0 && <p><b>CONTÉM:</b> {contains.join(", ")}.</p>}
    {mayContain.length > 0 && <p><b>PODE CONTER:</b> {mayContain.join(", ")}.</p>}
    {summary.complete && contains.length === 0 && mayContain.length === 0 && <p>
      Cadastro revisado sem marcações de CONTÉM/PODE CONTER. Isso não equivale a alegação de ausência de alergênicos.
    </p>}
    <small>
      Em caso de alergia, confirme ingredientes e possibilidade de contato cruzado com a equipe antes do consumo.
    </small>
  </aside>;
}

export function incompleteAllergenSummary(label = "informação do catálogo"): LilyAllergenSummary {
  return {
    complete: false,
    contains: [],
    mayContain: [],
    unreviewed: [label]
  };
}
