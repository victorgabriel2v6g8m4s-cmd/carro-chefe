import type { LoyaltyBenefitCatalog } from "../loyalty-types";
import { emptyMissionReward, type MissionRewardDraft } from "./types";

const labels: Record<MissionRewardDraft["kind"], string> = { product: "Produto", combo: "Combo", coupon: "Cupom", offer: "Oferta", vip: "Classe VIP" };

export function MissionRewardsEditor({ rewards, catalog, onChange }: { rewards: MissionRewardDraft[]; catalog: LoyaltyBenefitCatalog; onChange: (rewards: MissionRewardDraft[]) => void }) {
  function options(kind: MissionRewardDraft["kind"]) {
    if (kind === "product") return catalog.products.map(({ id, displayName }) => ({ id, label: displayName }));
    if (kind === "combo") return catalog.combos.map(({ id, name }) => ({ id, label: name }));
    if (kind === "coupon") return catalog.coupons.map(({ id, title, code }) => ({ id, label: `${title} · ${code}` }));
    if (kind === "offer") return catalog.offers.map(({ id, name }) => ({ id, label: name }));
    return [{ id: "vip", label: "Programa VIP" }];
  }

  function update(index: number, patch: Partial<MissionRewardDraft>) {
    onChange(rewards.map((reward, rewardIndex) => rewardIndex === index ? { ...reward, ...patch } : reward));
  }

  return <div className="mission-authoring-list">
    {rewards.map((reward, index) => <div className="mission-authoring-row" key={`${index}-${reward.kind}-${reward.id}`}>
      <label>Tipo<select value={reward.kind} onChange={(event) => { const kind = event.target.value as MissionRewardDraft["kind"]; update(index, { kind, id: "" }); }}>{Object.entries(labels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
      <label>Item<select value={reward.id} required onChange={(event) => update(index, { id: event.target.value })}><option value="">Selecione</option>{options(reward.kind).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Quantidade<input type="number" min="1" max="20" value={reward.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} /></label>
      <button type="button" className="button ghost" aria-label={`Remover recompensa ${index + 1}`} onClick={() => onChange(rewards.filter((_, rewardIndex) => rewardIndex !== index))}>Remover</button>
    </div>)}
    <button type="button" className="button ghost" onClick={() => onChange([...rewards, emptyMissionReward()])}>Adicionar recompensa</button>
    <small>Os itens ficam vinculados à missão. Regras de concessão e resgate são validadas pelo servidor.</small>
  </div>;
}
