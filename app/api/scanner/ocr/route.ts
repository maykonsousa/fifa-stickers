import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callVisionOcr } from "@/lib/scanner/vision-ocr";

// Proxy do OCR: segura a API key do Vision no servidor e valida a sessão antes
// de gastar cota. Recebe { image: base64 (sem prefixo data:) }, devolve { rawText }.
export async function POST(request: Request) {
  const supabase = await createClient();
  // Validação local do JWT via JWKS cacheado (ES256, confirmado em /.well-known/jwks.json).
  // Equivalente a getUser() pra gate de autenticação, mas SEM ida ao servidor de auth
  // em uso normal — economiza um round-trip inteiro por scan, que é o que pesa em
  // internet ruim. O user.id sai de claims.sub.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_VISION_API_KEY ausente");
    return NextResponse.json({ error: "OCR indisponível." }, { status: 500 });
  }

  let image: unknown;
  try {
    ({ image } = await request.json());
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json({ error: "Imagem ausente." }, { status: 400 });
  }

  try {
    const rawText = await callVisionOcr(image, apiKey);
    return NextResponse.json({ rawText });
  } catch (e) {
    console.error("Vision OCR falhou", e);
    return NextResponse.json({ error: "Falha na leitura." }, { status: 502 });
  }
}
