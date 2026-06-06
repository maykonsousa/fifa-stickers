import { describe, it, expect } from "vitest";
import { resolveScanAction } from "./resolve-scan-action";

describe("resolveScanAction", () => {
  it("lançamento: nova → verde, add, rótulo nova, Lançar", () => {
    expect(resolveScanAction("lancamento", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova lançada",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: repetida → verde, add, rótulo repetida, Lançar", () => {
    expect(resolveScanAction("lancamento", 3)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: fronteira ownedCount===1 → repetida, Lançar", () => {
    expect(resolveScanAction("lancamento", 1)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
      actionLabel: "Lançar",
    });
  });

  it("troca: não tem → verde, add, Pegar", () => {
    expect(resolveScanAction("troca", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
      actionLabel: "Pegar",
    });
  });

  it("troca: já tem → vermelho, none, Próxima", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "red",
      action: "none",
      message: "Você já tem — pula",
      actionLabel: "Próxima",
    });
  });

  it("baixa: tem repetida (>=2) → verde, remove, Entregar", () => {
    expect(resolveScanAction("baixa", 2)).toEqual({
      color: "green",
      action: "remove",
      message: "Baixa dada",
      actionLabel: "Entregar",
    });
  });

  it("baixa: só a única (==1) → amarelo, none, Próxima", () => {
    expect(resolveScanAction("baixa", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Essa é sua única",
      actionLabel: "Próxima",
    });
  });

  it("baixa: não tem (==0) → vermelho, none, Próxima", () => {
    expect(resolveScanAction("baixa", 0)).toEqual({
      color: "red",
      action: "none",
      message: "Você não tem essa",
      actionLabel: "Próxima",
    });
  });
});
