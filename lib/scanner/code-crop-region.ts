// Calcula o sub-retângulo do badge do código (canto superior direito) DENTRO do
// retângulo do mira que coverCropRegion devolve. Tudo em pixels de fonte. Função
// pura, sem DOM — o recorte fino vai pra crop-frame na hora de gerar o JPEG do
// Vision. Mandar só o badge = imagem menor (round-trip mais rápido) e sem a arte
// da carta (leitura mais certeira na primeira tentativa).

import type { CropRegion } from "./crop-frame";

export function codeCropRegion(mira: CropRegion, code: { w: number; h: number }): CropRegion {
  return {
    sx: mira.sx + mira.sw * (1 - code.w),
    sy: mira.sy,
    sw: mira.sw * code.w,
    sh: mira.sh * code.h,
  };
}
