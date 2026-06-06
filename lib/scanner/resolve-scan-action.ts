// Decide, a partir do modo do scanner e de quantas cópias o usuário já tem,
// a cor do sinal, a ação (mutação), a mensagem e o rótulo do botão de confirmar.
// Função pura — toda a regra de negócio dos modos vive aqui; o scanner-view só
// executa o resultado e o card só exibe.

export type ScanMode = "lancamento" | "troca" | "baixa";
export type ScanColor = "green" | "yellow" | "red";
export type ScanActionKind = "add" | "remove" | "none";

export interface ScanActionResult {
  color: ScanColor;
  action: ScanActionKind;
  message: string;
  // Rótulo do botão de confirmar: o verbo da ação ("Lançar"/"Pegar"/"Entregar")
  // quando há mutação; "Próxima" quando é só conferir a leitura (action "none").
  actionLabel: string;
}

// Mínimo de cópias pra dar baixa: precisa sobrar pelo menos 1 (não baixamos a única).
const MIN_OWNED_TO_REMOVE = 2;

export function resolveScanAction(mode: ScanMode, ownedCount: number): ScanActionResult {
  if (mode === "lancamento") {
    return {
      color: "green",
      action: "add",
      message: ownedCount > 0 ? "Repetida lançada" : "Nova lançada",
      actionLabel: "Lançar",
    };
  }

  if (mode === "troca") {
    return ownedCount === 0
      ? { color: "green", action: "add", message: "Nova — pega!", actionLabel: "Pegar" }
      : { color: "red", action: "none", message: "Você já tem — pula", actionLabel: "Próxima" };
  }

  if (mode === "baixa") {
    if (ownedCount >= MIN_OWNED_TO_REMOVE)
      return { color: "green", action: "remove", message: "Baixa dada", actionLabel: "Entregar" };
    if (ownedCount === 1)
      return { color: "yellow", action: "none", message: "Essa é sua única", actionLabel: "Próxima" };
    return { color: "red", action: "none", message: "Você não tem essa", actionLabel: "Próxima" };
  }

  // Exaustividade: se um modo novo entrar em ScanMode, o TS acusa aqui.
  const _exhaustive: never = mode;
  throw new Error(`modo de scan desconhecido: ${_exhaustive}`);
}
