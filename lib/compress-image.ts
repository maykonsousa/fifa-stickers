export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Figurinhas são exibidas em ~150-200px (≤400px em telas retina), então
// 600px de largura é suficiente. Dimensões/qualidade menores reduzem o
// tamanho do arquivo e, consequentemente, o egress do Storage.
const MAX_WIDTH = 600;
const MAX_HEIGHT = 900;
const QUALITY = 0.72;

export async function cropAndCompress(
  imageSrc: string,
  cropArea: CropArea
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");

  const targetWidth = Math.min(cropArea.width, MAX_WIDTH);
  const scale = targetWidth / cropArea.width;
  const targetHeight = Math.round(cropArea.height * scale);

  canvas.width = Math.min(targetWidth, MAX_WIDTH);
  canvas.height = Math.min(targetHeight, MAX_HEIGHT);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  if (blob) return blob;

  const fallback = await canvasToBlob(canvas, "image/png", 1);
  return fallback!;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
