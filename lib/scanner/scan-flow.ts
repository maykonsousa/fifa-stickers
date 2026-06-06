// Máquina de estados pura do fluxo de confirmação do scanner. Isola as transições
// de tela (procurando → confirmando → procurando, mais entrada manual) do plumbing
// de React/Supabase do scanner-view, pra ficar testável sem DOM. A MUTAÇÃO em si
// (lançar/baixa) não acontece aqui — é o scanner-view que executa no evento "confirm".
import type { ScannedSticker } from "./lookup-sticker-by-code";
import type { ScanMode } from "./resolve-scan-action";

export type ScanPhase =
  | { kind: "searching" }
  | { kind: "confirming"; sticker: ScannedSticker; mode: ScanMode }
  | { kind: "manual" };

export type ScanFlowEvent =
  | { type: "resolved"; sticker: ScannedSticker; mode: ScanMode }
  | { type: "confirm" }
  | { type: "reject" }
  | { type: "openManual" }
  | { type: "manualResolved"; sticker: ScannedSticker; mode: ScanMode }
  | { type: "closeManual" };

export const initialScanPhase: ScanPhase = { kind: "searching" };

export function scanFlowReducer(phase: ScanPhase, event: ScanFlowEvent): ScanPhase {
  switch (event.type) {
    case "resolved":
      // Só vira confirmação a partir de procurando — não atropela um card já aberto.
      return phase.kind === "searching"
        ? { kind: "confirming", sticker: event.sticker, mode: event.mode }
        : phase;
    case "manualResolved":
      return phase.kind === "manual"
        ? { kind: "confirming", sticker: event.sticker, mode: event.mode }
        : phase;
    case "openManual":
      // Abre o manual de procurando ou de uma confirmação; se já está no manual,
      // não faz nada (não reabre o que já está aberto).
      return phase.kind === "searching" || phase.kind === "confirming"
        ? { kind: "manual" }
        : phase;
    case "confirm":
    case "reject":
      return phase.kind === "confirming" ? { kind: "searching" } : phase;
    case "closeManual":
      return phase.kind === "manual" ? { kind: "searching" } : phase;
    default: {
      // Exaustividade: se um evento novo entrar em ScanFlowEvent sem tratamento,
      // o TS acusa aqui (event deixa de ser never).
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
