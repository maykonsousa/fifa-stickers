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

// Forma de um código impresso: 2–4 letras seguidas de 0–2 dígitos (ex.: CC, FWC,
// MEX1, RSA13). Só tokens com essa cara viram candidatos — assim o ruído do verso
// (FIFA, OFFICIAL, PANINI, WORLD, 2026, 13...) nem é testado contra os ~2.300
// códigos, evitando casar por acaso. Sem isso, com texto longo (pior nas
// figurinhas horizontais, que têm texto logo abaixo do badge), um token qualquer
// acabava casando a distância <= 1 com o código errado.
const CODE_SHAPE = /^[A-Z]{2,4}[0-9]{0,2}$/;

export function findCodeInText(rawText: string, validCodes: string[]): SnapResult | null {
  const tokens = rawText
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const candidates: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (CODE_SHAPE.test(tokens[i])) candidates.push(tokens[i]);
    if (i + 1 < tokens.length) {
      const pair = tokens[i] + tokens[i + 1];
      if (CODE_SHAPE.test(pair)) candidates.push(pair);
    }
  }
  if (candidates.length === 0) return null;

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
