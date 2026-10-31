import { useEffect, useState } from "react";
import { getCourierAvailability, setCourierAvailability } from "./availability-api";

export function CourierAvailabilityToggle({ csrfToken, allowSimulation }: { csrfToken: string; allowSimulation?: boolean }) {
  const [available, setAvailable] = useState(false);
  const [simulated, setSimulated] = useState(false);
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
      if (active) {
        setAvailable(state.available);
        setSimulated(state.simulatedAtPickup && Boolean(allowSimulation));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [allowSimulation]);

  useEffect(() => {
    if (!available) return;
    const timer = window.setInterval(() => {
      const refresh = simulated
        ? setCourierAvailability(true, csrfToken, undefined, true).then(() => undefined)
        : updateLocation();
      void refresh.catch(async () => {
        await setCourierAvailability(false, csrfToken).catch(() => undefined);
        setAvailable(false);
        setSimulated(false);
        setMessage("A localização deixou de estar disponível. Você foi marcado como indisponível.");
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [available, csrfToken, simulated]);

  async function toggle(useSimulation = false) {
    setBusy(true);
    setMessage("");
    try {
      if (available) {
        await setCourierAvailability(false, csrfToken);
        setAvailable(false);
        setSimulated(false);
        setMessage("Você está indisponível. Sua localização foi apagada.");
      } else if (useSimulation && allowSimulation) {
        await setCourierAvailability(true, csrfToken, undefined, true);
        setAvailable(true);
        setSimulated(true);
        setMessage("Modo de teste: posição simulada no ponto de coleta. Não use esta opção em operação real.");
      } else {
        await updateLocation();
        setSimulated(false);
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
    {!available && allowSimulation && <button type="button" className="button ghost" disabled={busy} onClick={() => void toggle(true)}>
      Simular no ponto de coleta (teste)
    </button>}
    <small aria-live="polite">{message || (available ? "A localização atualiza enquanto esta página estiver aberta." : "Ative para receber ofertas de entrega.")}</small>
  </div>;
}
