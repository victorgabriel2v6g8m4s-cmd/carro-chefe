import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lilyRoutingConfiguration,
  openRouteServiceEstimate,
  openStreetMapDirectionsUrl,
  serializeLilyRouteEstimate
} from "./routing";

describe("CookLily Entrega 11G routing", () => {
  const originalKey = process.env.COOKLILY_ORS_API_KEY;
  const originalBase = process.env.COOKLILY_ORS_BASE_URL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.COOKLILY_ORS_API_KEY;
    else process.env.COOKLILY_ORS_API_KEY = originalKey;
    if (originalBase === undefined) delete process.env.COOKLILY_ORS_BASE_URL;
    else process.env.COOKLILY_ORS_BASE_URL = originalBase;
  });

  it("fica desabilitado sem chave e usa o endpoint HeiGIT atual", () => {
    delete process.env.COOKLILY_ORS_API_KEY;
    delete process.env.COOKLILY_ORS_BASE_URL;
    expect(lilyRoutingConfiguration()).toMatchObject({
      provider: "openrouteservice",
      configured: false,
      baseUrl: "https://api.heigit.org/openrouteservice"
    });
  });

  it("geocodifica no backend e calcula distância/duração sem expor a chave", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let geocodeIndex = 0;
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/geocode/search")) {
        geocodeIndex += 1;
        const coordinates = geocodeIndex === 1
          ? [-54.6201, -20.4697]
          : [-54.6102, -20.4588];
        return new Response(JSON.stringify({
          features: [{ geometry: { coordinates } }]
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        routes: [{ summary: { distance: 4321.4, duration: 901.2 } }]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const result = await openRouteServiceEstimate({
      pickupAddress: "Loja CookLily, Campo Grande, MS, Brasil",
      destinationAddress: "Bairro Centro, Campo Grande, MS, Brasil",
      apiKey: "segredo-apenas-no-backend",
      baseUrl: "https://api.heigit.org/openrouteservice",
      fetchImpl,
      timeoutMs: 2000
    });

    expect(result).toEqual({
      origin: { lat: -20.4697, lng: -54.6201 },
      destination: { lat: -20.4588, lng: -54.6102 },
      distanceMeters: 4321,
      durationSeconds: 901
    });
    expect(calls).toHaveLength(3);
    expect(calls[0]?.url).toContain("https://api.heigit.org/openrouteservice/geocode/search?");
    expect(calls[2]?.url).toBe("https://api.heigit.org/openrouteservice/v2/directions/driving-car");
    expect(calls.every((call) => call.url.includes("segredo-apenas-no-backend") === false)).toBe(true);
    expect((calls[2]?.init?.headers as Record<string, string>).Authorization).toBe("segredo-apenas-no-backend");
  });

  it("só calcula horário de chegada depois da saída da coleta e separa mapa da resposta pública", () => {
    const estimate = {
      provider: "openrouteservice",
      originLat: -20.4697,
      originLng: -54.6201,
      destinationLat: -20.4588,
      destinationLng: -54.6102,
      distanceMeters: 5000,
      durationSeconds: 600,
      calculatedAt: new Date("2026-09-28T14:00:00.000Z")
    };
    const deliveryEvents = [
      { toStatus: "left_pickup", createdAt: new Date("2026-09-28T14:10:00.000Z") }
    ];

    const customer = serializeLilyRouteEstimate(estimate, {
      deliveryStatus: "left_pickup",
      deliveryEvents
    });
    expect(customer?.estimatedArrivalAt?.toISOString()).toBe("2026-09-28T14:20:00.000Z");
    expect(customer).not.toHaveProperty("mapUrl");
    expect(customer).not.toHaveProperty("destination");

    const courier = serializeLilyRouteEstimate(estimate, {
      deliveryStatus: "left_pickup",
      deliveryEvents,
      includeMap: true
    });
    expect(courier?.mapUrl).toContain("openstreetmap.org/directions");
    expect(courier?.destination).toEqual({ lat: -20.4588, lng: -54.6102 });

    const beforeDeparture = serializeLilyRouteEstimate(estimate, {
      deliveryStatus: "picked_up",
      deliveryEvents: []
    });
    expect(beforeDeparture?.estimatedArrivalAt).toBeNull();
  });

  it("gera link de navegação sem API key", () => {
    const url = openStreetMapDirectionsUrl({
      originLat: -20.4697,
      originLng: -54.6201,
      destinationLat: -20.4588,
      destinationLng: -54.6102
    });
    expect(url).toContain("openstreetmap.org/directions");
    expect(url).toContain("engine=fossgis_osrm_car");
    expect(url).not.toContain("api_key");
  });
});
