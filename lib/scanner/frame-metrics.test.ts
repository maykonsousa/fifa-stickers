import { describe, it, expect } from "vitest";
import { toGray, meanAbsDiff, contentScore, sharpness } from "./frame-metrics";

describe("toGray", () => {
  it("converte RGBA em um byte de luminância por pixel", () => {
    // 2 pixels: preto e branco (RGBA).
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const gray = toGray(rgba);
    expect(gray.length).toBe(2);
    expect(gray[0]).toBe(0);
    expect(gray[1]).toBe(255);
  });

  it("aplica os pesos Rec.601 no canal certo (R/G/B não são intercambiáveis)", () => {
    // Vermelho puro → 0.299*255 ≈ 76; verde puro → 0.587*255 ≈ 149.
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const gray = toGray(rgba);
    expect(gray[0]).toBe(76);
    expect(gray[1]).toBe(149);
  });
});

describe("meanAbsDiff", () => {
  it("é 0 para arrays iguais", () => {
    const a = new Uint8Array([10, 20, 30]);
    expect(meanAbsDiff(a, new Uint8Array([10, 20, 30]))).toBe(0);
  });

  it("é a média das diferenças absolutas", () => {
    const a = new Uint8Array([0, 0, 0]);
    const b = new Uint8Array([30, 0, 0]);
    expect(meanAbsDiff(a, b)).toBe(10); // (30+0+0)/3
  });

  it("é Infinity se os tamanhos diferem (frame incomparável)", () => {
    expect(meanAbsDiff(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(Infinity);
  });
});

describe("contentScore", () => {
  it("é 0 para superfície uniforme (sem conteúdo)", () => {
    expect(contentScore(new Uint8Array([100, 100, 100, 100]))).toBe(0);
  });

  it("é alto quando há contraste (preto e branco)", () => {
    const score = contentScore(new Uint8Array([0, 255, 0, 255]));
    expect(score).toBeGreaterThan(100);
  });
});

describe("sharpness", () => {
  it("buffer uniforme (sem bordas) → 0", () => {
    const flat = new Uint8Array(4 * 4).fill(128);
    expect(sharpness(flat, 4, 4)).toBe(0);
  });

  it("buffer com bordas fortes tem nitidez maior que um quase-uniforme", () => {
    const w = 4;
    const h = 4;
    // Tabuleiro de xadrez 0/255 = bordas em todo pixel interno.
    const sharp = new Uint8Array(w * h);
    for (let i = 0; i < sharp.length; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      sharp[i] = (x + y) % 2 === 0 ? 0 : 255;
    }
    const blurry = new Uint8Array(w * h).fill(120);
    expect(sharpness(sharp, w, h)).toBeGreaterThan(sharpness(blurry, w, h));
  });

  it("dimensões inválidas (sem pixels internos) → 0, sem NaN", () => {
    expect(sharpness(new Uint8Array(0), 0, 0)).toBe(0);
    expect(sharpness(new Uint8Array(2), 2, 1)).toBe(0); // h<3, nenhum pixel interno
  });
});
