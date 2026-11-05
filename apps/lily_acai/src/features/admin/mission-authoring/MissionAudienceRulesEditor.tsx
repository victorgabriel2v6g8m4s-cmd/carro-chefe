import type { LoyaltyLevel } from "../loyalty-types";
import { emptyAudienceRule, type MissionAudienceRuleDraft } from "./types";

export function MissionAudienceRulesEditor({ rules, levels, onChange }: { rules: MissionAudienceRuleDraft[]; levels: LoyaltyLevel[]; onChange: (rules: MissionAudienceRuleDraft[]) => void }) {
  function update(index: number, patch: Partial<MissionAudienceRuleDraft>) {
    onChange(rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  }

  return <div className="mission-authoring-list">
    {rules.map((rule, index) => <div className="mission-authoring-row" key={`${index}-${rule.field}-${rule.value}`}>
      <label>Operador<select value={rule.operator} onChange={(event) => update(index, { operator: event.target.value as MissionAudienceRuleDraft["operator"] })}><option value="and">E — também deve</option><option value="or">OU — pode corresponder</option><option value="except">EXCETO — excluir</option></select></label>
      <label>Critério<select value={rule.field} onChange={(event) => update(index, { field: event.target.value as MissionAudienceRuleDraft["field"], value: event.target.value === "class" ? "vip" : "" })}><option value="class">Categoria de usuário</option><option value="level">Nível</option><option value="user">Conta específica (ID)</option></select></label>
      <label>Valor{rule.field === "class" ? <select value={rule.value} onChange={(event) => update(index, { value: event.target.value })}><option value="vip">VIP</option><option value="standard">Padrão</option></select> : rule.field === "level" ? <select value={rule.value} onChange={(event) => update(index, { value: event.target.value })}><option value="">Selecione um nível</option>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select> : <input value={rule.value} maxLength={80} onChange={(event) => update(index, { value: event.target.value })} placeholder="ID da conta" />}</label>
      <button type="button" className="button ghost" aria-label={`Remover regra ${index + 1}`} onClick={() => onChange(rules.filter((_, ruleIndex) => ruleIndex !== index))}>Remover</button>
    </div>)}
    <button type="button" className="button ghost" onClick={() => onChange([...rules, emptyAudienceRule()])}>Adicionar regra de público</button>
    <small>As regras são avaliadas na ordem em que aparecem. Use E, OU e EXCETO para montar a combinação.</small>
  </div>;
}
