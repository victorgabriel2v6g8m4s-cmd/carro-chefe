import { describe, expect, it } from "vitest";
import { courierAvailabilitySchema, distanceMeters } from "./courier-dispatch";

describe("disponibilidade e ordenação de entregadores", () => {
  it("calcula distância geodésica e retorna zero para o mesmo ponto", () => {
    const point = { latitude: -20.45, longitude: -54.62 };
    expect(distanceMeters(point, point)).toBe(0);
    expect(distanceMeters(point, { latitude: -19.45, longitude: -54.62 })).toBeGreaterThan(110_000);
    expect(distanceMeters(point, { latitude: -19.45, longitude: -54.62 })).toBeLessThan(112_000);
  });

  it("só permite ficar disponível com latitude e longitude válidas", () => {
    expect(courierAvailabilitySchema.safeParse({ available: true, latitude: -20.45, longitude: -54.62 }).success).toBe(true);
    expect(courierAvailabilitySchema.safeParse({ available: true }).success).toBe(false);
    expect(courierAvailabilitySchema.safeParse({ available: true, latitude: 91, longitude: 0 }).success).toBe(false);
    expect(courierAvailabilitySchema.safeParse({ available: false }).success).toBe(true);
  });
});
