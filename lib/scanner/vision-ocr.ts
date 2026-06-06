// Parser e chamada à Google Cloud Vision (TEXT_DETECTION). Mantido aqui, em
// lib/, para ser testável no ambiente node do Vitest. A rota /api/scanner/ocr
// só faz o auth gate e delega pra cá.

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
  }>;
}

// Extrai o texto cru da resposta do Vision. fullTextAnnotation traz o bloco
// inteiro; textAnnotations[0] é o agregado de fallback. Sem texto → "".
export function extractRawText(json: VisionResponse): string {
  const r = json?.responses?.[0];
  return r?.fullTextAnnotation?.text ?? r?.textAnnotations?.[0]?.description ?? "";
}

// Chama o Vision com a imagem em base64 (sem prefixo data:). fetch é injetável
// pra teste. Lança se a resposta não for 2xx.
export async function callVisionOcr(
  imageBase64: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vision respondeu ${res.status}: ${detail}`);
  }
  return extractRawText(await res.json());
}
