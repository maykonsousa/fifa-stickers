import { describe, it, expect } from "vitest";
import { resolveScanAction } from "./resolve-scan-action";

describe("resolveScanAction", () => {
  it("lançamento: nova → verde, add, rótulo nova", () => {
    expect(resolveScanAction("lancamento", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova lançada",
    });
  });

  it("lançamento: repetida → verde, add, rótulo repetida", () => {
    expect(resolveScanAction("lancamento", 3)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
    });
  });

  it("lançamento: fronteira ownedCount===1 → repetida", () => {
    expect(resolveScanAction("lancamento", 1)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
    });
  });

  it("troca: não tem → verde, add", () => {
    expect(resolveScanAction("troca", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
    });
  });

  it("troca: já tem → vermelho, none", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "red",
      action: "none",
      message: "Você já tem — pula",
    });
  });

  it("baixa: tem repetida (>=2) → verde, remove", () => {
    expect(resolveScanAction("baixa", 2)).toEqual({
      color: "green",
      action: "remove",
      message: "Baixa dada",
    });
  });

  it("baixa: só a única (==1) → amarelo, none (protege)", () => {
    expect(resolveScanAction("baixa", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Essa é sua única",
    });
  });

  it("baixa: não tem (==0) → vermelho, none", () => {
    expect(resolveScanAction("baixa", 0)).toEqual({
      color: "red",
      action: "none",
      message: "Você não tem essa",
    });
  });
});
