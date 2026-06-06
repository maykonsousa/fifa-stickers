// Calcula a região do frame cru (intrínseco) que corresponde à caixa de mira
// quando o vídeo é exibido com `object-cover` numa caixa de tamanho boxW×boxH.
// Mantém a mira na tela alinhada ao recorte enviado ao OCR. Generaliza o recorte
// antigo: quando a caixa tem a mesma proporção do frame (vídeo sem corte), o
// resultado é idêntico a `MIRA × dimensões intrínsecas`.
import type { CropRegion } from "./crop-frame";

export function coverCropRegion(
  videoW: number,
  videoH: number,
  boxW: number,
  boxH: number,
  miraW: number,
  miraH: number,
): CropRegion {
  // Sem caixa medida ainda: trata como se o frame inteiro estivesse visível
  // (mesmo recorte centrado de antes), pra nunca gerar NaN.
  if (boxW <= 0 || boxH <= 0) {
    const sw = miraW * videoW;
    const sh = miraH * videoH;
    return { sx: (videoW - sw) / 2, sy: (videoH - sh) / 2, sw, sh };
  }
  const scale = Math.max(boxW / videoW, boxH / videoH);
  const sw = (miraW * boxW) / scale;
  const sh = (miraH * boxH) / scale;
  return { sx: (videoW - sw) / 2, sy: (videoH - sh) / 2, sw, sh };
}
