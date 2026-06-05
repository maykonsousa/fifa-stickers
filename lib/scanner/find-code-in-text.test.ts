import { describe, it, expect } from "vitest";
import { findCodeInText } from "./find-code-in-text";

const VALID = ["FWC00", "UZB7", "MEX1", "MEX10"];

describe("findCodeInText", () => {
  it("acha o código no meio do texto do verso, juntando prefixo + número", () => {
    expect(findCodeInText("FIFA WORLD CUP 2026 UZB 7 OFFICIAL", VALID)).toEqual({
      code: "UZB7",
      distance: 0,
    });
  });

  it("acha código sem espaço em meio a ruído e quebras de linha", () => {
    expect(findCodeInText("OFFICIAL\nMEX1\nPANINI", VALID)).toEqual({ code: "MEX1", distance: 0 });
  });

  it("é case-insensitive", () => {
    expect(findCodeInText("uzb 7 official", VALID)).toEqual({ code: "UZB7", distance: 0 });
  });

  it("prefere o casamento exato (distância 0) a um aproximado", () => {
    // "MEXI" casaria com MEX1 (dist 1), mas "UZB 7" junto dá UZB7 (dist 0).
    expect(findCodeInText("MEXI UZB 7", VALID)).toEqual({ code: "UZB7", distance: 0 });
  });

  it("retorna null quando só há ruído (sem falso-positivo)", () => {
    expect(findCodeInText("FIFA OFFICIAL LICENSED PRODUCT PANINI", VALID)).toBeNull();
  });

  it("rejeita casamento frouxo (distância > 1)", () => {
    // "FWC" sozinho está a distância 2 de FWC00 — não deve casar.
    expect(findCodeInText("FWC OFFICIAL", VALID)).toBeNull();
  });

  it("retorna null para texto vazio", () => {
    expect(findCodeInText("   \n  ", VALID)).toBeNull();
  });
});
