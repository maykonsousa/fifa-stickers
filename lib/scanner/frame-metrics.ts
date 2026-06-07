// Métricas puras sobre um frame já reduzido a tons de cinza. Usadas pelo loop do
// scanner pra decidir, sem custo, quando vale chamar o Vision (ver frame-signal).

// Converte um buffer RGBA (4 bytes/pixel, vindo de canvas.getImageData) em um
// byte de luminância por pixel. Luminância perceptual (Rec. 601).
export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    out[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

// Diferença média absoluta pixel a pixel entre dois frames cinza. Tamanhos
// diferentes → Infinity (não dá pra comparar; tratado como "mudou totalmente").
export function meanAbsDiff(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// "Quanta informação tem na mira" = variância da luminância. Superfície lisa
// (mesa vazia) ~0; figurinha com texto/figura → alto.
export function contentScore(gray: Uint8Array): number {
  if (gray.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < gray.length; i++) mean += gray[i];
  mean /= gray.length;
  let variance = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i] - mean;
    variance += d * d;
  }
  return variance / gray.length;
}

// Nitidez = variância do Laplaciano (kernel 4-vizinhos) sobre o buffer cinza.
// Frame borrado → resposta baixa em toda parte → variância baixa; texto nítido →
// bordas fortes → variância alta. Só percorre os pixels internos (precisa dos 4
// vizinhos), então exige w>=3 e h>=3; caso contrário devolve 0. Custo O(n).
export function sharpness(gray: Uint8Array, w: number, h: number): number {
  if (w < 3 || h < 3 || gray.length < w * h) return 0;
  const lap: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap.push(v);
    }
  }
  if (lap.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < lap.length; i++) mean += lap[i];
  mean /= lap.length;
  let variance = 0;
  for (let i = 0; i < lap.length; i++) {
    const d = lap[i] - mean;
    variance += d * d;
  }
  return variance / lap.length;
}
