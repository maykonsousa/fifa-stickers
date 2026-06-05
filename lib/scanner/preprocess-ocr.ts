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
