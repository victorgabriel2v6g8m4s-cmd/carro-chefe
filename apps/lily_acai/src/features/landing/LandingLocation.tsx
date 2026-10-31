import { LandingReveal } from "./LandingReveal";
import { landingCopy as copy } from "./landing-copy";

export function LandingLocation({ enabled, address }: { enabled: boolean; address: string | null }) {
  if (!enabled) return null;
  const mapUrl = address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;
  const directionsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  return <LandingReveal className="landing-location"><div className="landing-location-copy"><header><span className="eyebrow">CookLily</span><h2>{copy.locationTitle}</h2></header>
    {address && mapUrl && directionsUrl ? <><p>{address}</p><a className="button ghost" href={directionsUrl} target="_blank" rel="noreferrer">{copy.mapAction}</a></> : <p>{copy.locationUnavailable}</p>}</div>
    {address && mapUrl && <iframe title={`Mapa: ${address}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
  </LandingReveal>;
}
