import type { ChangeEvent } from "react";
import { uploadLilyMedia } from "../../api";
import type { LoyaltyBenefitCatalog, LoyaltyLevel } from "./loyalty-types";
import { LoyaltyBenefitPicker } from "./LoyaltyBenefitPicker";

export function LoyaltyLevelEditor({ level, index, priorThreshold, previousStep, csrfToken, catalog, onChange, onError }: {
  level: LoyaltyLevel;
  index: number;
  priorThreshold: number;
  previousStep: number | null;
  csrfToken: string;
  catalog: LoyaltyBenefitCatalog;
  onChange: (patch: Partial<LoyaltyLevel>) => void;
  onError: (message: string) => void;
}) {
  const currentStep = Math.max(0, level.requiredPoints - priorThreshold);
  const ratio = previousStep && previousStep > 0 ? Number((currentStep / previousStep).toFixed(2)) : 1;

  async function uploadIcon(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const svg = file.type === "image/svg+xml" || file.name.toLocaleLowerCase("pt-BR").endsWith(".svg");
    if (!(svg || ["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > (svg ? 1024 * 1024 : 5 * 1024 * 1024)) {
      onError("Use SVG vetorial de até 1 MB ou PNG, JPEG e WebP de até 5 MB para o ícone do nível.");
      return;
    }
    try {
      const uploadFile = svg && file.type !== "image/svg+xml" ? new File([file], file.name, { type: "image/svg+xml" }) : file;
      const media = await uploadLilyMedia(uploadFile, csrfToken);
      onChange({ iconMediaId: media.id, iconUrl: media.url });
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível enviar a arte do nível.");
    }
  }

  return <article className="loyalty-level-row">
    <div className="loyalty-level-identity">
      <div className="loyalty-level-art">{level.iconUrl ? <img src={level.iconUrl} alt={`Ícone de ${level.name}`} /> : <span aria-hidden="true">✦</span>}</div>
      <label>Ícone do nível (aceita SVG)<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => void uploadIcon(event)} /></label>
    </div>
    <label>Nível<input value={level.name} maxLength={80} onChange={(event) => onChange({ name: event.target.value })} /></label>
    <label>Pontos acumulados<input type="number" min="0" step="1" value={level.requiredPoints} onChange={(event) => onChange({ requiredPoints: Number(event.target.value) })} /></label>
    <label>Avanço relativo ao anterior
      <span className="loyalty-ratio-input"><input type="number" min="0.01" step="0.05" value={ratio} disabled={previousStep === null} aria-describedby={`loyalty-ratio-hint-${index}`} onChange={(event) => {
        const value = Number(event.target.value);
        if (previousStep === null || !Number.isFinite(value) || value <= 0) return;
        onChange({ requiredPoints: priorThreshold + Math.round(previousStep * value) });
      }} /><span>×</span></span>
      <small id={`loyalty-ratio-hint-${index}`}>{previousStep === null ? "Primeiro avanço, sem proporção anterior" : `${currentStep.toLocaleString("pt-BR")} pontos neste avanço ÷ ${previousStep.toLocaleString("pt-BR")} no anterior`}</small>
    </label>
    <label>LilyCoins ao atingir<input type="number" min="0" step="1" value={level.lilyCoins} onChange={(event) => onChange({ lilyCoins: Number(event.target.value) })} /></label>
    <div className="loyalty-level-benefits"><span className="loyalty-field-label">Benefícios</span><LoyaltyBenefitPicker benefits={level.benefits} catalog={catalog} onChange={(benefits) => onChange({ benefits })} /></div>
    <label className="toggle"><input type="checkbox" checked={level.active} onChange={(event) => onChange({ active: event.target.checked })} />Ativo</label>
  </article>;
}
