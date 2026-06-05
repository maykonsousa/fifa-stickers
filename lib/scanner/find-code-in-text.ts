import { snapToValidCode, type SnapResult } from "./snap-to-valid-code";

// Garimpa o código dentro de um texto inteiro lido do verso da figurinha.
// Em vez de exigir que o usuário mire só no código, lemos a região toda e
// procuramos, entre todas as palavras, qual casa com a lista fechada de códigos
// válidos. O código impresso costuma vir como prefixo + número ("UZB 7"), então
// também testamos pares de tokens adjacentes juntos ("UZB" + "7" → "UZB7").
//
// Como o texto vem cheio de ruído (FIFA, OFFICIAL, PANINI...), exigimos um
// casamento apertado (distância <= 1) pra evitar falso-positivo.
const MAX_DISTANCE = 1;

export function findCodeInText(rawText: string, validCodes: string[]): SnapResult | null {
  const tokens = rawText
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const candidates: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    candidates.push(tokens[i]);
    if (i + 1 < tokens.length) candidates.push(tokens[i] + tokens[i + 1]);
  }

  let best: SnapResult | null = null;
  for (const candidate of candidates) {
    const snap = snapToValidCode(candidate, validCodes);
    if (snap && (best === null || snap.distance < best.distance)) {
      best = snap;
      if (best.distance === 0) break;
    }
  }

  if (best && best.distance <= MAX_DISTANCE) return best;
  return null;
}
