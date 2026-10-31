import { parseResponse } from "../../api";

export async function getCourierAvailability() {
  const response = await fetch("/api/v1/lily/courier/availability", { credentials: "same-origin" });
  return parseResponse<{ available: boolean; simulatedAtPickup: boolean }>(response);
}

export async function setCourierAvailability(
  available: boolean,
  csrfToken: string,
  position?: GeolocationPosition,
  simulateAtPickup = false
) {
  const response = await fetch("/api/v1/lily/courier/availability", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify({
      available,
      ...(simulateAtPickup ? { simulateAtPickup: true } : {}),
      ...(position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : {})
    })
  });
  return parseResponse<{ available: boolean }>(response);
}
