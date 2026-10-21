import { useId, useState } from "react";
import type { LilyAllergenSummary } from "../../api";

export function AllergenNotice(props: {
  summary: LilyAllergenSummary | null | undefined;
  compact?: boolean;
  heading?: string;
  collapsible?: boolean;
}) {
  const { summary } = props;
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  if (!summary) return null;

  const contains = summary.contains.map((item) => item.label);
  const mayContain = summary.mayContain.map((item) => item.label);
  const collapsible = props.collapsible ?? true;
  const heading = props.heading ?? "Alergênicos";

  const details = <>
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
  </>;

  return <aside
    className={"allergen-notice" + (props.compact ? " is-compact" : "") + (!summary.complete ? " is-incomplete" : "")}
    aria-label={heading}
  >
    {collapsible ? <>
      <button
        type="button"
        className="allergen-notice-trigger"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        <strong>{heading}</strong>
        <span aria-hidden="true" className={"allergen-notice-chevron" + (expanded ? " is-expanded" : "")}>⌄</span>
      </button>
      <div id={detailsId} className="allergen-notice-details" hidden={!expanded}>
        {details}
      </div>
    </> : <>
      <strong>{heading}</strong>
      {details}
    </>}
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
