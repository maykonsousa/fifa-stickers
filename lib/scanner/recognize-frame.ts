import Tesseract, { PSM } from "tesseract.js";

export interface OcrResult {
  rawText: string;
  confidence: number;
}

let workerPromise: Promise<Tesseract.Worker> | null = null;

// Worker único reaproveitado entre leituras (carrega o WASM uma vez).
async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng");
      // Códigos são alfanuméricos maiúsculos — restringe o alfabeto pra reduzir erro.
      // PSM SINGLE_LINE: a região de mira contém só o código (uma linha), não uma página.
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function recognizeFrame(
  image: Blob | HTMLCanvasElement,
): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return { rawText: data.text ?? "", confidence: data.confidence ?? 0 };
}

export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
