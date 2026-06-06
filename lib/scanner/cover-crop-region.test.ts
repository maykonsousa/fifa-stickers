import { describe, it, expect } from "vitest";
import { coverCropRegion } from "./cover-crop-region";

describe("coverCropRegion", () => {
  it("caixa com a mesma proporção do frame → recorte igual a MIRA × intrínseco", () => {
    // frame 1000x750 (4:3), caixa 400x300 (4:3), mira 0.8 x 0.6
    expect(coverCropRegion(1000, 750, 400, 300, 0.8, 0.6)).toEqual({
      sx: 100,
      sy: 150,
      sw: 800,
      sh: 450,
    });
  });

  it("caixa mais baixa que o frame (corte vertical) → sh menor, centrado", () => {
    // frame 1000x1000, caixa 400x200; s = max(0.4, 0.2) = 0.4
    expect(coverCropRegion(1000, 1000, 400, 200, 0.8, 0.6)).toEqual({
      sx: 100, // (1000 - 800)/2
      sy: 350, // (1000 - 300)/2
      sw: 800, // 0.8 * 400 / 0.4
      sh: 300, // 0.6 * 200 / 0.4
    });
  });

  it("caixa com dimensão 0 (layout ainda não medido) → fallback MIRA × intrínseco, sem NaN", () => {
    expect(coverCropRegion(1000, 750, 0, 0, 0.8, 0.6)).toEqual({
      sx: 100,
      sy: 150,
      sw: 800,
      sh: 450,
    });
  });
});
