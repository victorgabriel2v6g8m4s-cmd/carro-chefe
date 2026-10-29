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
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      onError("Use uma imagem de até 5 MB para o ícone do nível.");
      return;
    }
    try {
      const media = await uploadLilyMedia(file, csrfToken);
      onChange({ iconMediaId: media.id, iconUrl: media.url });
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível enviar a arte do nível.");
    }
  }

  return <article className="loyalty-level-row">
    <div className="loyalty-level-identity">
      <div className="loyalty-level-art">{level.iconUrl ? <img src={level.iconUrl} alt={`Ícone de ${level.name}`} /> : <span aria-hidden="true">✦</span>}</div>
      <label>Ícone do nível<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadIcon(event)} /></label>
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
