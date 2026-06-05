// Pré-processamento de imagem pro OCR. O código no verso é pequeno e às vezes
// claro sobre fundo escuro — então recortamos só a região de interesse, damos
// upscale e convertemos pra tons de cinza. A inversão (claro↔escuro) é feita
// por quem chama, via dupla passada (ver invertCanvas).

export interface CropRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Upscale ajuda o Tesseract com texto pequeno. Como agora a região é grande
// (a figurinha inteira), 2x equilibra legibilidade e custo do OCR.
const UPSCALE = 2;

// Recorta (opcional), dá upscale e converte pra tons de cinza.
export function preprocessForOcr(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  region?: CropRegion,
): HTMLCanvasElement {
  const r = region ?? { sx: 0, sy: 0, sw: srcW, sh: srcH };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(r.sw * UPSCALE);
  canvas.height = Math.round(r.sh * UPSCALE);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Binarização adaptativa (algoritmo de Bradley com imagem integral — o mesmo do
// adaptiveThreshold do OpenCV, mas em JS puro, sem o WASM de 8MB). Compara cada
// pixel com a média de uma vizinhança local, então lida bem com reflexo e luz
// irregular do verso plastificado. Opera in-place no canvas (espera tons de cinza).
const THRESHOLD_WINDOW_DIVISOR = 8; // janela ≈ largura / 8
const THRESHOLD_T = 0.15; // quão mais escuro que a média local pra virar preto

export function adaptiveThreshold(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const gray = new Float64Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  // Imagem integral: integral[idx] = soma de todos os pixels acima-e-à-esquerda.
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let v = gray[idx];
      if (x > 0) v += integral[idx - 1];
      if (y > 0) v += integral[idx - w];
      if (x > 0 && y > 0) v -= integral[idx - w - 1];
      integral[idx] = v;
    }
  }

  const half = Math.max(1, Math.floor(w / THRESHOLD_WINDOW_DIVISOR) >> 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half);
      const y2 = Math.min(h - 1, y + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const A = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
      const B = y1 > 0 ? integral[(y1 - 1) * w + x2] : 0;
      const C = x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0;
      const sum = integral[y2 * w + x2] - B - C + A;
      const idx = y * w + x;
      const val = gray[idx] * count <= sum * (1 - THRESHOLD_T) ? 0 : 255;
      const di = idx * 4;
      d[di] = d[di + 1] = d[di + 2] = val;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Devolve uma cópia invertida (negativo) — pra ler texto claro em fundo escuro.
export function invertCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Carrega um File de imagem num HTMLImageElement (pro modo foto).
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
