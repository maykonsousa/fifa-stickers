import { describe, it, expect } from "vitest";
import { resolveScanAction } from "./resolve-scan-action";

describe("resolveScanAction", () => {
  it("lançamento: nova → verde, add, rótulo nova, Lançar", () => {
    expect(resolveScanAction("lancamento", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: repetida → amarelo (warning), add, rótulo repetida, Lançar", () => {
    expect(resolveScanAction("lancamento", 3)).toEqual({
      color: "yellow",
      action: "add",
      message: "Repetida",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: fronteira ownedCount===1 → repetida amarela, Lançar", () => {
    expect(resolveScanAction("lancamento", 1)).toEqual({
      color: "yellow",
      action: "add",
      message: "Repetida",
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

  it("troca: já tem e fora da wishlist → amarelo, none, Próxima", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Você tem 1 figurinha",
      actionLabel: "Próxima",
    });
  });

  it("troca: já tem 2 e fora da wishlist → amarelo, none, plural", () => {
    expect(resolveScanAction("troca", 2)).toEqual({
      color: "yellow",
      action: "none",
      message: "Você tem 2 figurinhas",
      actionLabel: "Próxima",
    });
  });

  it("troca: já tem e na wishlist → verde, add, Pegar (mostra quantidade)", () => {
    expect(resolveScanAction("troca", 2, true)).toEqual({
      color: "green",
      action: "add",
      message: "Você quer mais dessa — pega! (tem 2)",
      actionLabel: "Pegar",
    });
  });

  it("troca: não tem, wishlisted não muda nada → verde, add, Pegar, 'Nova'", () => {
    expect(resolveScanAction("troca", 0, true)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
      actionLabel: "Pegar",
    });
  });

  it("baixa: tem repetida (>=2) → verde, remove, Entregar", () => {
    expect(resolveScanAction("baixa", 2)).toEqual({
      color: "green",
      action: "remove",
      message: "Repetida",
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
