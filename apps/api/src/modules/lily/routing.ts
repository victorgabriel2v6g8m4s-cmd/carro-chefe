import crypto from "node:crypto";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { getLilyOperationalSettings } from "./fulfillment";

const DEFAULT_ORS_BASE_URL = "https://api.heigit.org/openrouteservice";
const DEFAULT_TIMEOUT_MS = 6000;
const PROVIDER = "openrouteservice";

type FetchLike = typeof fetch;

type Coordinate = {
  lat: number;
  lng: number;
};

type RouteSummary = {
  origin: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  durationSeconds: number;
};

function configuredTimeout() {
  const value = Number(process.env.COOKLILY_ROUTING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) ? Math.min(15000, Math.max(1000, Math.round(value))) : DEFAULT_TIMEOUT_MS;
}

function configuredBaseUrl() {
  const raw = process.env.COOKLILY_ORS_BASE_URL?.trim() || DEFAULT_ORS_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function lilyRoutingConfiguration() {
  return {
    provider: PROVIDER,
    configured: Boolean(process.env.COOKLILY_ORS_API_KEY?.trim()),
    baseUrl: configuredBaseUrl(),
    timeoutMs: configuredTimeout()
  };
}

function destinationAddressText(raw: string | null) {
  if (!raw) return null;
  try {
    const address = JSON.parse(raw) as Record<string, unknown>;
    const part = (key: string) => typeof address[key] === "string" ? String(address[key]).trim() : "";
    const streetLine = [part("street"), part("number")].filter(Boolean).join(", ");
    return [
      streetLine,
      part("neighborhood"),
      [part("city"), part("state")].filter(Boolean).join(" - "),
      part("postalCode"),
      "Brasil"
    ].filter(Boolean).join(", ");
  } catch {
    return null;
  }
}

function sourceHash(pickupAddress: string, destinationAddress: string) {
  return crypto.createHash("sha256")
    .update(JSON.stringify({ pickupAddress, destinationAddress }))
    .digest("hex");
}

function ensureCoordinate(input: unknown): Coordinate {
  if (!Array.isArray(input) || input.length < 2) {
    throw new ApiError(503, "O provedor de mapas não retornou uma coordenada válida.", {
      code: "LILY_ROUTING_GEOCODE_INVALID"
    });
  }
  const lng = Number(input[0]);
  const lat = Number(input[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)
    || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(503, "O provedor de mapas não retornou uma coordenada válida.", {
      code: "LILY_ROUTING_GEOCODE_INVALID"
    });
  }
  return { lat, lng };
}

async function jsonResponse(response: Response, code: string) {
  if (!response.ok) {
    throw new ApiError(503, "O provedor de mapas está temporariamente indisponível.", {
      code,
      providerStatus: response.status
    });
  }
  try {
    return await response.json() as any;
  } catch {
    throw new ApiError(503, "O provedor de mapas retornou uma resposta inválida.", { code });
  }
}

export async function openRouteServiceEstimate(input: {
  pickupAddress: string;
  destinationAddress: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<RouteSummary> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = (input.baseUrl || DEFAULT_ORS_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers = {
    Authorization: input.apiKey,
    Accept: "application/json"
  };

  const geocode = async (text: string) => {
    const params = new URLSearchParams({
      text,
      size: "1",
      "boundary.country": "BR"
    });
    const response = await fetchImpl(`${baseUrl}/geocode/search?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs)
    });
    const body = await jsonResponse(response, "LILY_ROUTING_GEOCODE_FAILED");
    const coordinates = body?.features?.[0]?.geometry?.coordinates;
    return ensureCoordinate(coordinates);
  };

  const [origin, destination] = await Promise.all([
    geocode(input.pickupAddress),
    geocode(input.destinationAddress)
  ]);

  const routeResponse = await fetchImpl(`${baseUrl}/v2/directions/driving-car`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat]
      ],
      instructions: false
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const route = await jsonResponse(routeResponse, "LILY_ROUTING_DIRECTIONS_FAILED");
  const summary = route?.routes?.[0]?.summary;
  const distanceMeters = Math.round(Number(summary?.distance));
  const durationSeconds = Math.round(Number(summary?.duration));
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0
    || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new ApiError(503, "O provedor de mapas não retornou uma rota utilizável.", {
      code: "LILY_ROUTING_DIRECTIONS_INVALID"
    });
  }

  return { origin, destination, distanceMeters, durationSeconds };
}

export function openStreetMapDirectionsUrl(input: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}) {
  const route = `${input.originLat},${input.originLng};${input.destinationLat},${input.destinationLng}`;
  const params = new URLSearchParams({
    engine: "fossgis_osrm_car",
    route
  });
  return `https://www.openstreetmap.org/directions?${params.toString()}`;
}

export async function getOrCreateLilyRouteEstimate(orderId: string) {
  const apiKey = process.env.COOKLILY_ORS_API_KEY?.trim();
  if (!apiKey) {
    return { available: false as const, reason: "not_configured" as const };
  }

  const [order, settings] = await Promise.all([
    lilyPrisma.lilyOrder.findFirst({
      where: { id: orderId, fulfillmentType: "delivery" },
      include: { routeEstimate: true }
    }),
    getLilyOperationalSettings()
  ]);
  if (!order) {
    throw new ApiError(404, "Entrega não encontrada.", { code: "LILY_DELIVERY_NOT_FOUND" });
  }

  const pickupAddress = (settings.pickupAddressText || settings.publicAddressText || "").trim();
  const destinationAddress = destinationAddressText(order.addressSnapshotJson);
  if (!pickupAddress || !destinationAddress) {
    return { available: false as const, reason: "address_incomplete" as const };
  }

  const currentSourceHash = sourceHash(pickupAddress, destinationAddress);
  if (order.routeEstimate?.sourceHash === currentSourceHash) {
    return { available: true as const, estimate: order.routeEstimate, cached: true };
  }

  let summary: RouteSummary;
  try {
    summary = await openRouteServiceEstimate({
      pickupAddress,
      destinationAddress,
      apiKey,
      baseUrl: configuredBaseUrl(),
      timeoutMs: configuredTimeout()
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { available: false as const, reason: "provider_unavailable" as const };
    }
    return { available: false as const, reason: "provider_unavailable" as const };
  }

  const calculatedAt = new Date();
  const estimate = await lilyPrisma.lilyDeliveryRouteEstimate.upsert({
    where: { orderId },
    update: {
      provider: PROVIDER,
      sourceHash: currentSourceHash,
      originLat: summary.origin.lat,
      originLng: summary.origin.lng,
      destinationLat: summary.destination.lat,
      destinationLng: summary.destination.lng,
      distanceMeters: summary.distanceMeters,
      durationSeconds: summary.durationSeconds,
      calculatedAt
    },
    create: {
      orderId,
      provider: PROVIDER,
      sourceHash: currentSourceHash,
      originLat: summary.origin.lat,
      originLng: summary.origin.lng,
      destinationLat: summary.destination.lat,
      destinationLng: summary.destination.lng,
      distanceMeters: summary.distanceMeters,
      durationSeconds: summary.durationSeconds,
      calculatedAt
    }
  });

  return { available: true as const, estimate, cached: false };
}

export function serializeLilyRouteEstimate(
  estimate: {
    provider: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceMeters: number;
    durationSeconds: number;
    calculatedAt: Date;
  } | null | undefined,
  options: {
    deliveryStatus?: string | null;
    deliveryEvents?: Array<{ toStatus: string; createdAt: Date }>;
    includeMap?: boolean;
  } = {}
) {
  if (!estimate) return null;
  const departedAt = options.deliveryEvents
    ?.find((event) => event.toStatus === "left_pickup")?.createdAt ?? null;
  const etaEligible = departedAt
    && ["left_pickup", "courier_arrived_delivery"].includes(options.deliveryStatus || "");
  const estimatedArrivalAt = etaEligible
    ? new Date(departedAt.getTime() + estimate.durationSeconds * 1000)
    : null;

  return {
    provider: estimate.provider,
    distanceMeters: estimate.distanceMeters,
    durationSeconds: estimate.durationSeconds,
    calculatedAt: estimate.calculatedAt,
    estimatedArrivalAt,
    isLive: false,
    ...(options.includeMap ? {
      origin: { lat: estimate.originLat, lng: estimate.originLng },
      destination: { lat: estimate.destinationLat, lng: estimate.destinationLng },
      mapUrl: openStreetMapDirectionsUrl(estimate)
    } : {})
  };
}
