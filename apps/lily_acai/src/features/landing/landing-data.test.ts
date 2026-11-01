import { describe, expect, it } from "vitest";
import { landingCropImageStyle } from "./landing-data";

describe("recorte da arte do banner", () => {
  it("mantém a imagem centralizada no zoom base e desloca a arte nos dois eixos ao ampliar", () => {
    expect(landingCropImageStyle({ x: 50, y: 50, zoom: 1 })).toEqual({ objectPosition: "50% 50%", transform: "translate(0%, 0%) scale(1)" });
    expect(landingCropImageStyle({ x: 50, y: 0, zoom: 2 })).toEqual({ objectPosition: "50% 0%", transform: "translate(0%, 50%) scale(2)" });
    expect(landingCropImageStyle({ x: 100, y: 100, zoom: 1.5 })).toEqual({ objectPosition: "100% 100%", transform: "translate(-25%, -25%) scale(1.5)" });
  });
});
