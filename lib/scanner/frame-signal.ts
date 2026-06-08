// Máquina de estados pura do gatilho on-device. Recebe métricas baratas de cada
// amostra de frame (ver frame-metrics) e decide quando vale gastar UMA chamada
// paga ao Vision. Garante ~1 chamada por figurinha:
//   searching → acumula amostras estáveis e com conteúdo → "fire" → rearm
//   rearm     → espera o frame mudar do último lido (figurinha saiu) → searching
// Quem chama atualiza a "assinatura do último lido" no momento do fire.

export type FramePhase = "searching" | "rearm";

export interface FrameThresholds {
  diff: number; // diffFromPrev <= diff → estável
  content: number; // content >= content → tem conteúdo na mira
  rearmDiff: number; // diffFromLastRead >= rearmDiff → figurinha trocou
  stableSamples: number; // nº de amostras estáveis seguidas pra disparar
  sharpness: number; // sharpness >= sharpness → badge nítido o bastante pra ler
}

export interface FrameSample {
  diffFromPrev: number; // diff vs amostra anterior
  content: number; // contraste/variância da mira
  sharpness: number; // nitidez (variância do Laplaciano) na região do badge
  diffFromLastRead: number | null; // diff vs assinatura do último lido (null se nunca leu)
}

export interface FrameState {
  phase: FramePhase;
  stableCount: number;
}

export type FrameDecision =
  | { kind: "wait"; state: FrameState }
  | { kind: "fire"; state: FrameState };

export function initialFrameState(): FrameState {
  return { phase: "searching", stableCount: 0 };
}

export function nextFrameSignal(
  state: FrameState,
  sample: FrameSample,
  t: FrameThresholds,
): FrameDecision {
  if (state.phase === "rearm") {
    // diffFromLastRead null aqui = caller sem assinatura do último lido: tratamos
    // como "não mudou" e ficamos em rearm, pra nunca disparar outra chamada às
    // cegas. O frame que dispara a volta a searching é de movimento (diff alto) e
    // de propósito NÃO é reavaliado como estável — a contagem recomeça do zero.
    const moved = sample.diffFromLastRead !== null && sample.diffFromLastRead >= t.rearmDiff;
    if (moved) return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
    return { kind: "wait", state };
  }

  // searching
  const stable = sample.diffFromPrev <= t.diff;
  const hasContent = sample.content >= t.content;
  const sharp = sample.sharpness >= t.sharpness;
  if (!stable || !hasContent || !sharp) {
    return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
  }

  const stableCount = state.stableCount + 1;
  if (stableCount >= t.stableSamples) {
    return { kind: "fire", state: { phase: "rearm", stableCount: 0 } };
  }
  return { kind: "wait", state: { phase: "searching", stableCount } };
}
