import { describe, it, expect } from "vitest";
import { snapToValidCode } from "./snap-to-valid-code";

const VALID = ["FWC00", "FWC1", "MEX1", "MEX10", "MEX11"];

describe("snapToValidCode", () => {
  it("encaixa match exato com distância 0 (case-insensitive)", () => {
    expect(snapToValidCode("mex1", VALID)).toEqual({ code: "MEX1", distance: 0 });
  });

  it("remove espaços e ruído antes de comparar", () => {
    expect(snapToValidCode("FWC 00", VALID)).toEqual({ code: "FWC00", distance: 0 });
  });

  it("corrige erro comum de OCR (I↔1) escolhendo o mais próximo", () => {
    expect(snapToValidCode("MEXI", VALID)).toEqual({ code: "MEX1", distance: 1 });
  });

  it("retorna null quando nada está perto o suficiente", () => {
    expect(snapToValidCode("ZZZZ9", VALID)).toBeNull();
  });

  it("retorna null para texto vazio", () => {
    expect(snapToValidCode("   ", VALID)).toBeNull();
  });
});
