// Lê o texto de um frame chamando a rota server-side, que faz o OCR no Google
// Vision. Recebe a imagem já recortada/comprimida em base64 (ver crop-frame).
// Nunca lança: em qualquer falha devolve "" pra não travar o loop do scanner
// (o cliente cai no estado "não consegui ler" + busca manual).
export async function recognizeFrame(imageBase64: string): Promise<string> {
  try {
    const res = await fetch("/api/scanner/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data?.rawText === "string" ? data.rawText : "";
  } catch {
    return "";
  }
}
