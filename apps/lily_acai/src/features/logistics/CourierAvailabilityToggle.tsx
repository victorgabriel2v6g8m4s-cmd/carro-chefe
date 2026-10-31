import { useEffect, useState } from "react";
import { getCourierAvailability, setCourierAvailability } from "./availability-api";

export function CourierAvailabilityToggle({ csrfToken }: { csrfToken: string }) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateLocation() {
    if (!navigator.geolocation) throw new Error("Este aparelho não oferece acesso à localização.");
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 20_000,
        timeout: 12_000
      });
    });
    await setCourierAvailability(true, csrfToken, position);
    setAvailable(true);
    setMessage("Disponível para receber ofertas. Sua localização é usada somente para ordenar entregas.");
  }

  useEffect(() => {
    let active = true;
    void getCourierAvailability().then((state) => {
      if (active) setAvailable(state.available);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!available) return;
    const timer = window.setInterval(() => {
      void updateLocation().catch(async () => {
        await setCourierAvailability(false, csrfToken).catch(() => undefined);
        setAvailable(false);
        setMessage("A localização deixou de estar disponível. Você foi marcado como indisponível.");
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [available, csrfToken]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      if (available) {
        await setCourierAvailability(false, csrfToken);
        setAvailable(false);
        setMessage("Você está indisponível. Sua localização foi apagada.");
      } else {
        await updateLocation();
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível atualizar sua disponibilidade.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="courier-availability">
    <button type="button" className={available ? "button courier-online" : "button ghost"} disabled={busy} onClick={() => void toggle()}>
      {busy ? "Atualizando…" : available ? "Disponível · ficar offline" : "Ficar disponível"}
    </button>
    <small aria-live="polite">{message || (available ? "A localização atualiza enquanto esta página estiver aberta." : "Ative para receber ofertas de entrega.")}</small>
  </div>;
}
