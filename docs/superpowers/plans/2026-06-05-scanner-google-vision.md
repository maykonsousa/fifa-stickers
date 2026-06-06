# Scanner Google Vision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o motor de OCR do scanner de figurinha de Tesseract.js (on-device) para Google Cloud Vision (`TEXT_DETECTION`) via uma rota server-side que segura a API key, mantendo todo o fluxo de uso intacto.

**Architecture:** O browser recorta a janela de mira num JPEG comprimido (base64) e faz `POST /api/scanner/ocr`. A rota valida a sessão Supabase, chama o Vision REST com `GOOGLE_VISION_API_KEY` e devolve `{ rawText }`. O cliente segue com `findCodeInText` (encaixe na lista fechada de códigos válidos) exatamente como hoje. A lógica testável (parser da resposta do Vision, chamada HTTP) vive em `lib/scanner/` para casar com o setup de teste (Vitest em ambiente `node`); a cola de canvas/DOM e a rota são verificadas manualmente.

**Tech Stack:** Next.js 16 (Route Handlers), Google Cloud Vision REST API, Supabase SSR (`@supabase/ssr`), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-scanner-google-vision-design.md`

---

## File Structure

- **Create** `lib/scanner/vision-ocr.ts` — parser puro `extractRawText` + chamada HTTP `callVisionOcr` (fetch injetável). Toda a lógica testável do Vision.
- **Create** `lib/scanner/vision-ocr.test.ts` — testes do parser e da chamada.
- **Create** `lib/scanner/crop-frame.ts` — `cropToJpegBase64` (recorta a mira → JPEG base64) + tipo `CropRegion`. Cola de canvas, sem teste unitário (sem DOM no ambiente de teste).
- **Create** `lib/scanner/load-image.ts` — `loadImage` (movido de `preprocess-ocr.ts`).
- **Create** `app/api/scanner/ocr/route.ts` — Route Handler `POST`: auth gate + proxy do Vision.
- **Create** `app/api/scanner/ocr/route.test.ts` — testes da rota (401 / 200 / 502).
- **Rewrite** `lib/scanner/recognize-frame.ts` — passa a fazer `fetch("/api/scanner/ocr")` e retornar a string `rawText`.
- **Create/Rewrite** `lib/scanner/recognize-frame.test.ts` — testes com `fetch` global mockado.
- **Modify** `app/(authenticated)/collection/scanner/scanner-view.tsx` — rewire pro novo pipeline; remove dupla-passada e imports de pré-processamento.
- **Modify** `vitest.config.ts` — incluir `app/**/*.test.ts` para a rota.
- **Delete** `lib/scanner/preprocess-ocr.ts` (após mover `loadImage`).
- **Modify** `package.json` / `package-lock.json` — remover `tesseract.js`.
- **Modify** `.env.example` (e `.env` local) — adicionar `GOOGLE_VISION_API_KEY`.

Ordem pensada para que **cada commit deixe o build verde**: primeiro adicionamos as peças novas (aditivo), depois fazemos o cutover do cliente num único commit atômico, e por fim limpamos a dependência.

---

### Task 1: Configuração da env var

**Files:**
- Modify: `.env.example`
- Modify: `.env` (local, não versionado)

- [ ] **Step 1: Adicionar a chave ao `.env.example`**

Acrescente ao final de `.env.example`:

```
# Google Cloud Vision — OCR do scanner de figurinha (API key, tipo AIza...)
GOOGLE_VISION_API_KEY=
```

- [ ] **Step 2: Adicionar a chave real ao `.env` local**

No `.env` (não versionado), adicione a mesma linha com o valor real da sua API key:

```
GOOGLE_VISION_API_KEY=AIza...   # sua chave
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(scanner): adiciona env GOOGLE_VISION_API_KEY"
```

---

### Task 2: Parser e chamada ao Vision (`vision-ocr.ts`)

**Files:**
- Create: `lib/scanner/vision-ocr.ts`
- Test: `lib/scanner/vision-ocr.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Crie `lib/scanner/vision-ocr.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { extractRawText, callVisionOcr } from "./vision-ocr";

describe("extractRawText", () => {
  it("usa fullTextAnnotation.text quando presente", () => {
    const json = { responses: [{ fullTextAnnotation: { text: "FIFA\nMEX1\nOFFICIAL" } }] };
    expect(extractRawText(json)).toBe("FIFA\nMEX1\nOFFICIAL");
  });

  it("cai para textAnnotations[0].description quando não há fullTextAnnotation", () => {
    const json = { responses: [{ textAnnotations: [{ description: "MEX1" }] }] };
    expect(extractRawText(json)).toBe("MEX1");
  });

  it("retorna string vazia quando não há texto", () => {
    expect(extractRawText({ responses: [{}] })).toBe("");
    expect(extractRawText({})).toBe("");
  });
});

describe("callVisionOcr", () => {
  it("monta a request correta e devolve o texto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responses: [{ fullTextAnnotation: { text: "MEX1" } }] }),
    });
    const text = await callVisionOcr("BASE64DATA", "KEY123", fetchMock as unknown as typeof fetch);

    expect(text).toBe("MEX1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://vision.googleapis.com/v1/images:annotate");
    expect(url).toContain("key=KEY123");
    const body = JSON.parse(init.body);
    expect(body.requests[0].image.content).toBe("BASE64DATA");
    expect(body.requests[0].features[0].type).toBe("TEXT_DETECTION");
  });

  it("lança erro quando a resposta não é ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" });
    await expect(
      callVisionOcr("X", "KEY", fetchMock as unknown as typeof fetch),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npm test -- vision-ocr`
Expected: FAIL — `Cannot find module './vision-ocr'`.

- [ ] **Step 3: Implementar `vision-ocr.ts`**

Crie `lib/scanner/vision-ocr.ts`:

```ts
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
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npm test -- vision-ocr`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/vision-ocr.ts lib/scanner/vision-ocr.test.ts
git commit -m "feat(scanner): parser e chamada à Google Vision (vision-ocr)"
```

---

### Task 3: Route Handler `/api/scanner/ocr`

**Files:**
- Create: `app/api/scanner/ocr/route.ts`
- Create: `app/api/scanner/ocr/route.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Incluir testes de `app/` no Vitest**

Em `vitest.config.ts`, troque a linha do `include`:

```ts
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
```

- [ ] **Step 2: Escrever os testes que falham**

Crie `app/api/scanner/ocr/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/scanner/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scanner/ocr", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_VISION_API_KEY = "KEY123";
    getUser.mockReset();
  });

  it("retorna 401 sem sessão", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ image: "X" }));
    expect(res.status).toBe(401);
  });

  it("retorna { rawText } com sessão e Vision ok", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ responses: [{ fullTextAnnotation: { text: "MEX1" } }] }),
      }),
    );
    const res = await POST(makeRequest({ image: "BASE64" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rawText: "MEX1" });
  });

  it("retorna 502 quando o Vision falha", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" }),
    );
    const res = await POST(makeRequest({ image: "BASE64" }));
    expect(res.status).toBe(502);
  });

  it("retorna 400 sem imagem", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Rodar os testes e ver falhar**

Run: `npm test -- route`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 4: Implementar a rota**

Crie `app/api/scanner/ocr/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callVisionOcr } from "@/lib/scanner/vision-ocr";

// Proxy do OCR: segura a API key do Vision no servidor e valida a sessão antes
// de gastar cota. Recebe { image: base64 (sem prefixo data:) }, devolve { rawText }.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npm test -- route`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add app/api/scanner/ocr/route.ts app/api/scanner/ocr/route.test.ts vitest.config.ts
git commit -m "feat(scanner): rota /api/scanner/ocr (auth gate + proxy do Vision)"
```

---

### Task 4: `crop-frame.ts` (recorte → JPEG base64)

**Files:**
- Create: `lib/scanner/crop-frame.ts`

Sem teste unitário: depende de `<canvas>`/DOM, indisponível no ambiente `node` do Vitest. Verificado manualmente na Task 7.

- [ ] **Step 1: Implementar `crop-frame.ts`**

Crie `lib/scanner/crop-frame.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros novos referentes a `crop-frame.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/scanner/crop-frame.ts
git commit -m "feat(scanner): crop-frame (recorte da mira → JPEG base64)"
```

---

### Task 5: Mover `loadImage` para `load-image.ts`

**Files:**
- Create: `lib/scanner/load-image.ts`

`preprocess-ocr.ts` ainda existe e é importado por `scanner-view.tsx` até a Task 6 — por isso só **criamos** o novo arquivo aqui; a remoção do antigo acontece no cutover.

- [ ] **Step 1: Criar `load-image.ts`**

Crie `lib/scanner/load-image.ts` (copiado de `preprocess-ocr.ts`, sem alterações de lógica):

```ts
// Carrega um File de imagem num HTMLImageElement (usado pelo modo foto).
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/scanner/load-image.ts
git commit -m "refactor(scanner): extrai loadImage para load-image.ts"
```

---

### Task 6: Cutover — recognize-frame + scanner-view + remover preprocess

Commit atômico: troca o motor de leitura. Faz-se de uma vez pra manter o build verde no boundary (a nova assinatura de `recognizeFrame` e a remoção de `preprocess-ocr` quebrariam `scanner-view` se feitas isoladas).

**Files:**
- Rewrite: `lib/scanner/recognize-frame.ts`
- Create: `lib/scanner/recognize-frame.test.ts`
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`
- Delete: `lib/scanner/preprocess-ocr.ts`

- [ ] **Step 1: Escrever os testes de `recognize-frame` que falham**

Crie `lib/scanner/recognize-frame.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { recognizeFrame } from "./recognize-frame";

afterEach(() => vi.unstubAllGlobals());

describe("recognizeFrame", () => {
  it("posta a imagem na rota e devolve rawText", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rawText: "MEX1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await recognizeFrame("BASE64");

    expect(text).toBe("MEX1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/scanner/ocr");
    expect(JSON.parse(init.body)).toEqual({ image: "BASE64" });
  });

  it("retorna string vazia quando a rota responde erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    expect(await recognizeFrame("X")).toBe("");
  });

  it("retorna string vazia em erro de rede (não quebra o loop)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await recognizeFrame("X")).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- recognize-frame`
Expected: FAIL — a implementação atual usa Tesseract e a assinatura não bate.

- [ ] **Step 3: Reescrever `recognize-frame.ts`**

Substitua todo o conteúdo de `lib/scanner/recognize-frame.ts` por:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- recognize-frame`
Expected: PASS (3 testes).

- [ ] **Step 5: Rewire `scanner-view.tsx` — imports**

Em `app/(authenticated)/collection/scanner/scanner-view.tsx`, substitua as duas linhas de import:

```ts
import { recognizeFrame, terminateOcr } from "@/lib/scanner/recognize-frame";
import { preprocessForOcr, adaptiveThreshold, invertCanvas, loadImage } from "@/lib/scanner/preprocess-ocr";
```

por:

```ts
import { recognizeFrame } from "@/lib/scanner/recognize-frame";
import { cropToJpegBase64 } from "@/lib/scanner/crop-frame";
import { loadImage } from "@/lib/scanner/load-image";
```

- [ ] **Step 6: Rewire — cleanup do efeito de montagem**

Na cleanup do primeiro `useEffect`, remova a chamada `void terminateOcr();`. O bloco fica:

```ts
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
```

- [ ] **Step 7: Rewire — remover `runOcr` (dupla-passada)**

Apague todo o `useCallback` `runOcr` (o bloco que faz `recognizeFrame` + `invertCanvas`), incluindo o comentário acima dele.

- [ ] **Step 8: Rewire — `captureFromVideo`**

Substitua o corpo de `captureFromVideo` por:

```ts
  const captureFromVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setState("reading");
    const sw = video.videoWidth * MIRA.w;
    const sh = video.videoHeight * MIRA.h;
    const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, {
      sx: (video.videoWidth - sw) / 2,
      sy: (video.videoHeight - sh) / 2,
      sw,
      sh,
    });
    const rawText = await recognizeFrame(image);
    await resolveRawText(rawText);
  }, [resolveRawText]);
```

- [ ] **Step 9: Rewire — `handlePhoto`**

Substitua o corpo de `handlePhoto` por:

```ts
  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setState("reading");
      const img = await loadImage(file);
      const image = cropToJpegBase64(img, img.naturalWidth, img.naturalHeight);
      const rawText = await recognizeFrame(image);
      await resolveRawText(rawText);
    },
    [resolveRawText],
  );
```

- [ ] **Step 10: Deletar `preprocess-ocr.ts`**

```bash
git rm lib/scanner/preprocess-ocr.ts
```

- [ ] **Step 11: Verificar tipos, lint e testes**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sem erros de tipo, lint limpo, todos os testes passam. (Confirme que não sobrou nenhuma referência a `preprocessForOcr`, `adaptiveThreshold`, `invertCanvas`, `terminateOcr` ou `recognize-frame`/`preprocess-ocr` com assinatura antiga.)

- [ ] **Step 12: Commit**

```bash
git add lib/scanner/recognize-frame.ts lib/scanner/recognize-frame.test.ts app/\(authenticated\)/collection/scanner/scanner-view.tsx
git commit -m "feat(scanner): cutover do OCR para Google Vision via rota"
```

---

### Task 7: Remover a dependência `tesseract.js`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Confirmar que ninguém mais importa tesseract**

Run: `grep -rn "tesseract" app lib`
Expected: nenhum resultado.

- [ ] **Step 2: Desinstalar**

```bash
npm uninstall tesseract.js
```

- [ ] **Step 3: Verificar build e testes**

Run: `npm run build && npm test`
Expected: build conclui e todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(scanner): remove dependência tesseract.js"
```

---

### Task 8: Verificação manual em campo

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

- [ ] **Step 2: Testar o fluxo logado**

Logado, abra `/collection/scanner`. Em modo foto e (se disponível) modo vídeo, leia o verso de uma figurinha real. Confirme:
- O código é detectado e o cartão de confirmação aparece com "Você já tem: N".
- "Lançar" registra (toast com "Desfazer") e volta a ler.
- Código ilegível → estado "não consegui ler" com busca manual.

- [ ] **Step 3: Confirmar o auth gate**

Deslogado (ou em aba anônima), `POST /api/scanner/ocr` deve responder 401 — a key não é gasta por anônimos.

- [ ] **Step 4: Confirmar que a key não vaza ao browser**

No DevTools → Network, a chamada do browser é para `/api/scanner/ocr` (mesma origem), **não** para `vision.googleapis.com`. A API key não aparece em nenhuma request do cliente.
