import { landingCopy as copy } from "./landing-copy";
import "./landing-story.css";

const journey = [
  { icon: "✓", key: "mission", preview: <div className="story-preview-mission"><span className="story-preview-pill"><i>✓</i> Missão concluída</span><strong>Participe da comunidade</strong><small>Recompensa definida pela missão</small><div><span>Progresso</span><b>Concluído</b></div></div> },
  { icon: "⌕", key: "survey", preview: <div className="story-preview-survey"><span className="story-preview-pill">Pesquisa CookLily</span><strong>Conte o que você prefere</strong><div className="story-preview-choice">Açaí com frutas <i>✓</i></div><div className="story-preview-choice">Novas combinações</div><small>Responder pesquisas soma pontos conforme a campanha.</small></div> },
  { icon: "↗", key: "levels", preview: <div className="story-preview-levels"><div><span className="story-preview-level-icon">✦</span><span><small>Nível atual</small><strong>Sua jornada</strong></span></div><div className="story-preview-progress"><i /></div><small>Seus pontos aproximam você do próximo nível.</small><span className="story-preview-reward"><i>✦</i> Benefícios disponíveis para resgate</span></div> },
  { icon: "◉", key: "store", preview: <div className="story-preview-store"><span className="story-preview-store-icon">◉</span><span className="story-preview-pill">Prévia da Store</span><strong>Escolha como usar suas LilyCoins</strong><div className="story-preview-store-items"><span>✦ Cupons</span><span>◉ Produtos</span></div><small>Itens e disponibilidade serão definidos pela CookLily.</small></div> }
];

export function LandingStory() {
  return <article className="landing-story" aria-labelledby="landing-story-title">
    <header className="landing-story-header"><span className="eyebrow">A experiência CookLily</span><h2 id="landing-story-title">{copy.storyTitle}</h2></header>
    <p className="landing-story-intro">{copy.storyIntro}</p>
    <div className="landing-journey-map" role="img" aria-label="Fluxo: missões geram LilyCoins para a Store; pesquisas geram pontos, que avançam níveis e liberam benefícios.">
      <div><span>✓</span><strong>Missões</strong></div><b aria-hidden="true">→</b>
      <div><span>◉</span><strong>LilyCoins</strong></div><b aria-hidden="true">→</b>
      <div><span>✦</span><strong>Store</strong></div>
      <i aria-hidden="true" />
      <div><span>⌕</span><strong>Pesquisas</strong></div><b aria-hidden="true">→</b>
      <div><span>↗</span><strong>Pontos e níveis</strong></div><b aria-hidden="true">→</b>
      <div><span>✦</span><strong>Benefícios</strong></div>
    </div>
    <div className="landing-story-list">{journey.map(({ icon, key, preview }, index) => {
      const item = copy.storyCards[index];
      return <section className={`landing-story-card landing-story-card-${key}`} key={key}>
        <div className="landing-story-card-copy"><span className="landing-story-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="landing-story-card-icon" aria-hidden="true">{icon}</span><h3>{item.title}</h3><p>{item.text}</p></div>
        <div className="landing-story-preview" role="group" aria-label={`Prévia ilustrativa: ${item.title}`}><span className="landing-story-preview-label">Prévia ilustrativa</span>{preview}</div>
      </section>;
    })}</div>
  </article>;
}
