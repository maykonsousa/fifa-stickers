import { describe, it, expect } from "vitest";
import { toGray, meanAbsDiff, contentScore } from "./frame-metrics";

describe("toGray", () => {
  it("converte RGBA em um byte de luminância por pixel", () => {
    // 2 pixels: preto e branco (RGBA).
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const gray = toGray(rgba);
    expect(gray.length).toBe(2);
    expect(gray[0]).toBe(0);
    expect(gray[1]).toBe(255);
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
