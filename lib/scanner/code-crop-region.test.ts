import { describe, it, expect } from "vitest";
import { codeCropRegion } from "./code-crop-region";

describe("codeCropRegion", () => {
  it("ancora no canto superior direito com as frações dadas", () => {
    // mira 800x600 começando em (100, 50); badge 50% largura x 20% altura
    const mira = { sx: 100, sy: 50, sw: 800, sh: 600 };
    expect(codeCropRegion(mira, { w: 0.5, h: 0.2 })).toEqual({
      sx: 500, // 100 + 800 * (1 - 0.5)
      sy: 50, // topo do mira
      sw: 400, // 800 * 0.5
      sh: 120, // 600 * 0.2
    });
  });

  it("largura/altura cheias (1.0) devolvem o próprio mira", () => {
    const mira = { sx: 10, sy: 20, sw: 300, sh: 200 };
    expect(codeCropRegion(mira, { w: 1, h: 1 })).toEqual({
      sx: 10,
      sy: 20,
      sw: 300,
      sh: 200,
    });
  });
});
