// Decide, a partir do modo do scanner e de quantas cópias o usuário já tem,
// a cor do sinal, a ação (mutação) e a mensagem mostrada. Função pura — toda a
// regra de negócio dos modos vive aqui; o scanner-view só executa o resultado.

export type ScanMode = "lancamento" | "troca" | "baixa";
export type ScanColor = "green" | "yellow" | "red";
export type ScanActionKind = "add" | "remove" | "none";

export interface ScanActionResult {
  color: ScanColor;
  action: ScanActionKind;
  message: string;
}

export function resolveScanAction(mode: ScanMode, ownedCount: number): ScanActionResult {
  if (mode === "lancamento") {
    return {
      color: "green",
      action: "add",
      message: ownedCount > 0 ? "Repetida lançada" : "Nova lançada",
    };
  }

  if (mode === "troca") {
    return ownedCount === 0
      ? { color: "green", action: "add", message: "Nova — pega!" }
      : { color: "red", action: "none", message: "Você já tem — pula" };
  }

  // baixa
  if (ownedCount >= 2) return { color: "green", action: "remove", message: "Baixa dada" };
  if (ownedCount === 1) return { color: "yellow", action: "none", message: "Essa é sua única" };
  return { color: "red", action: "none", message: "Você não tem essa" };
}
