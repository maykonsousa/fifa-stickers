// Recorta a janela de mira de um vídeo/imagem e exporta um JPEG comprimido em
// base64 (sem prefixo data:) pra mandar ao Vision. Sem cinza/binarização — o
// Vision lida melhor com a foto colorida crua; só recortamos e comprimimos
// pra manter o payload pequeno.

export interface CropRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const JPEG_QUALITY = 0.8;

export function cropToJpegBase64(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  region?: CropRegion,
): string {
  const r = region ?? { sx: 0, sy: 0, sw: srcW, sh: srcH };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(r.sw);
  canvas.height = Math.round(r.sh);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.split(",")[1] ?? "";
}
