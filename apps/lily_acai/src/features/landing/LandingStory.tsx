import { landingCopy as copy } from "./landing-copy";

export function LandingStory() {
  return <article className="landing-story" aria-labelledby="landing-story-title">
    <header><span className="eyebrow">A experiência CookLily</span><h2 id="landing-story-title">{copy.storyTitle}</h2></header><p>{copy.storyIntro}</p>
    <div className="landing-story-list">{copy.storyCards.map((item, index) => <section className="landing-story-card" key={item.title}>
      <span className="landing-story-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
    </section>)}</div>
  </article>;
}
