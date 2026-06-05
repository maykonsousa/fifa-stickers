# Scanner de Figurinha por Código — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir lançar figurinhas lendo o código impresso no verso pela câmera (OCR on-device), uma de cada vez, com confirmação que mostra se o usuário já possui.

**Architecture:** Nova rota `/collection/scanner` (grupo `(authenticated)`). A leitura roda no aparelho com Tesseract.js; o texto bruto é encaixado na lista fechada de `code` válidos por distância de edição. Captura híbrida: vídeo ao vivo via `getUserMedia` quando possível, fallback automático para foto (`<input capture>`) em navegador in-app. A lógica pura (encaixe de código, escolha de modo) é coberta por testes vitest; câmera/UI são verificadas manualmente no app.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), React 19, Supabase (`@supabase/ssr`), Tesseract.js (OCR WASM), vitest (testes), sonner (toasts), shadcn `Dialog`.

> **Nota:** o AGENTS.md manda ler `node_modules/next/dist/docs/`, mas esse diretório **não existe** nesta instalação. Siga os padrões já presentes em `app/(authenticated)` (server `page.tsx` faz auth e passa `userId`; a view é `"use client"`).

---

### Task 0: Setup de dependências e test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar dependências**

```bash
npm install tesseract.js
npm install -D vitest
```

- [ ] **Step 2: Adicionar script de teste**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Criar config do vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Verificar que o runner roda (sem testes ainda)**

Run: `npm test`
Expected: vitest inicia e reporta "No test files found" (ou 0 testes) — sem erro de config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add tesseract.js e vitest para o scanner"
```

---

### Task 1: Encaixe do código lido na lista válida (`snapToValidCode`)

Função pura: normaliza o texto bruto do OCR e o encaixa no `code` válido mais próximo por distância de edição (Levenshtein). Retorna `null` quando nada está perto o suficiente.

**Files:**
- Create: `lib/scanner/snap-to-valid-code.ts`
- Test: `lib/scanner/snap-to-valid-code.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/scanner/snap-to-valid-code.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { snapToValidCode } from "./snap-to-valid-code";

const VALID = ["FWC00", "FWC1", "MEX1", "MEX10", "MEX11"];

describe("snapToValidCode", () => {
  it("encaixa match exato com distância 0 (case-insensitive)", () => {
    expect(snapToValidCode("mex1", VALID)).toEqual({ code: "MEX1", distance: 0 });
  });

  it("remove espaços e ruído antes de comparar", () => {
    expect(snapToValidCode("FWC 00", VALID)).toEqual({ code: "FWC00", distance: 0 });
  });

  it("corrige erro comum de OCR (I↔1) escolhendo o mais próximo", () => {
    expect(snapToValidCode("MEXI", VALID)).toEqual({ code: "MEX1", distance: 1 });
  });

  it("retorna null quando nada está perto o suficiente", () => {
    expect(snapToValidCode("ZZZZ9", VALID)).toBeNull();
  });

  it("retorna null para texto vazio", () => {
    expect(snapToValidCode("   ", VALID)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/scanner/snap-to-valid-code.test.ts`
Expected: FAIL — `snapToValidCode` não existe / módulo não encontrado.

- [ ] **Step 3: Implementar o mínimo**

Create `lib/scanner/snap-to-valid-code.ts`:

```ts
export interface SnapResult {
  code: string;
  distance: number;
}

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// Tolerância de erro proporcional ao tamanho do código:
// códigos curtos (<=4) aceitam 1 erro; mais longos aceitam 2.
function maxDistanceFor(code: string): number {
  return code.length <= 4 ? 1 : 2;
}

export function snapToValidCode(raw: string, validCodes: string[]): SnapResult | null {
  const cleaned = normalize(raw);
  if (cleaned.length === 0) return null;

  let best: SnapResult | null = null;
  for (const code of validCodes) {
    const distance = levenshtein(cleaned, code);
    if (distance > maxDistanceFor(code)) continue;
    if (best === null || distance < best.distance) {
      best = { code, distance };
      if (distance === 0) break;
    }
  }
  return best;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/scanner/snap-to-valid-code.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/snap-to-valid-code.ts lib/scanner/snap-to-valid-code.test.ts
git commit -m "feat(scanner): encaixe de código lido na lista válida"
```

---

### Task 2: Escolha do modo de captura (`chooseCaptureMode`)

Função pura que decide entre vídeo ao vivo e foto, a partir de dois sinais já disponíveis (in-app browser? `getUserMedia` existe?).

**Files:**
- Create: `lib/scanner/choose-capture-mode.ts`
- Test: `lib/scanner/choose-capture-mode.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/scanner/choose-capture-mode.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chooseCaptureMode } from "./choose-capture-mode";

describe("chooseCaptureMode", () => {
  it("usa vídeo ao vivo quando há getUserMedia e não é in-app", () => {
    expect(chooseCaptureMode({ inApp: false, hasGetUserMedia: true })).toBe("live");
  });

  it("cai para foto em navegador in-app", () => {
    expect(chooseCaptureMode({ inApp: true, hasGetUserMedia: true })).toBe("photo");
  });

  it("cai para foto quando getUserMedia não existe", () => {
    expect(chooseCaptureMode({ inApp: false, hasGetUserMedia: false })).toBe("photo");
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/scanner/choose-capture-mode.test.ts`
Expected: FAIL — função não existe.

- [ ] **Step 3: Implementar o mínimo**

Create `lib/scanner/choose-capture-mode.ts`:

```ts
export type CaptureMode = "live" | "photo";

export interface CaptureEnv {
  inApp: boolean;
  hasGetUserMedia: boolean;
}

export function chooseCaptureMode({ inApp, hasGetUserMedia }: CaptureEnv): CaptureMode {
  if (inApp || !hasGetUserMedia) return "photo";
  return "live";
}

// Lê os sinais do ambiente do browser. Não é chamado em testes (impuro).
export function detectCaptureEnv(): CaptureEnv {
  const hasGetUserMedia =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  // isInAppBrowser importado pelo chamador para manter este módulo testável.
  return { inApp: false, hasGetUserMedia };
}
```

> A composição com `isInAppBrowser()` é feita no `ScannerView` (Task 7), que chama
> `chooseCaptureMode({ inApp: isInAppBrowser(), hasGetUserMedia: detectCaptureEnv().hasGetUserMedia })`.

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/scanner/choose-capture-mode.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/choose-capture-mode.ts lib/scanner/choose-capture-mode.test.ts
git commit -m "feat(scanner): seleção de modo de captura (live/photo)"
```

---

### Task 3: Lookup exato de figurinha por código

Busca um sticker pelo `code` exato e conta quantas o usuário já tem. Sem novo schema — consulta direta às tabelas existentes.

**Files:**
- Create: `lib/scanner/lookup-sticker-by-code.ts`

- [ ] **Step 1: Implementar a função**

Create `lib/scanner/lookup-sticker-by-code.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScannedSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

export async function lookupStickerByCode(
  supabase: SupabaseClient,
  code: string,
  userId: string,
): Promise<ScannedSticker | null> {
  const { data: sticker } = await supabase
    .from("stickers")
    .select("id, code, title, image_url")
    .eq("code", code)
    .maybeSingle();

  if (!sticker) return null;

  const { count } = await supabase
    .from("user_stickers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sticker_id", sticker.id);

  return {
    id: sticker.id,
    code: sticker.code,
    title: sticker.title,
    image_url: sticker.image_url,
    owned_count: count ?? 0,
  };
}
```

- [ ] **Step 2: Verificar que compila (typecheck)**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a este arquivo.

- [ ] **Step 3: Commit**

```bash
git add lib/scanner/lookup-sticker-by-code.ts
git commit -m "feat(scanner): lookup exato de figurinha por código com contagem"
```

---

### Task 4: Wrapper de OCR (Tesseract.js)

Encapsula a leitura de um frame/blob com Tesseract e devolve texto bruto + confiança. Thin wrapper, verificado manualmente (depende de WASM).

**Files:**
- Create: `lib/scanner/recognize-frame.ts`

- [ ] **Step 1: Implementar o wrapper**

Create `lib/scanner/recognize-frame.ts`:

```ts
import Tesseract from "tesseract.js";

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
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
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
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros novos neste arquivo.

- [ ] **Step 3: Commit**

```bash
git add lib/scanner/recognize-frame.ts
git commit -m "feat(scanner): wrapper Tesseract.js com worker reaproveitado"
```

---

### Task 5: Cartão de confirmação (`ScannerConfirmCard`)

Exibe a figurinha resolvida, o status de posse e as três ações. Componente de apresentação puro (recebe dados e callbacks).

**Files:**
- Create: `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx`

- [ ] **Step 1: Implementar o componente**

Create `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx`:

```tsx
"use client";

import { Check, X, Search, Loader2 } from "lucide-react";
import type { ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";

interface Props {
  sticker: ScannedSticker;
  busy: boolean;
  onLancar: () => void;
  onDescartar: () => void;
  onBuscarManual: () => void;
}

export function ScannerConfirmCard({
  sticker,
  busy,
  onLancar,
  onDescartar,
  onBuscarManual,
}: Props) {
  const owns = sticker.owned_count > 0;

  return (
    <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4 shadow-2xl">
      <div className="flex gap-3">
        <div className="relative h-28 w-[87px] shrink-0 overflow-hidden rounded-lg bg-black">
          {sticker.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sticker.image_url} alt={sticker.code} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-500">
              sem foto
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-lg font-bold text-white">{sticker.code}</p>
          {sticker.title && <p className="text-sm text-gray-300">{sticker.title}</p>}
          <p className={`mt-1 text-sm ${owns ? "text-yellow-400" : "text-gray-400"}`}>
            {owns ? `Você já tem: ${sticker.owned_count}` : "Você ainda não tem"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onLancar}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {owns ? "Lançar repetida" : "Lançar"}
        </button>
        <button
          onClick={onDescartar}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" /> Descartar
        </button>
      </div>
      <button
        onClick={onBuscarManual}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 disabled:opacity-50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" /> Não é essa? Buscar manualmente
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck e lint**

Run: `npx tsc --noEmit && npx eslint app/\(authenticated\)/collection/scanner/scanner-confirm-card.tsx`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-confirm-card.tsx"
git commit -m "feat(scanner): cartão de confirmação com status de posse"
```

---

### Task 6: Orquestrador do scanner (`ScannerView`)

Client component que junta tudo: decide o modo de captura, carrega os códigos válidos, controla o loop ler→decidir→ler, contador de sessão, desfazer e fallback manual.

**Files:**
- Create: `app/(authenticated)/collection/scanner/scanner-view.tsx`

- [ ] **Step 1: Implementar o componente**

Create `app/(authenticated)/collection/scanner/scanner-view.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isInAppBrowser } from "@/lib/detect-in-app-browser";
import { chooseCaptureMode, detectCaptureEnv, type CaptureMode } from "@/lib/scanner/choose-capture-mode";
import { snapToValidCode } from "@/lib/scanner/snap-to-valid-code";
import { recognizeFrame, terminateOcr } from "@/lib/scanner/recognize-frame";
import { lookupStickerByCode, type ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import { ScannerConfirmCard } from "./scanner-confirm-card";

type ScanState = "idle" | "reading" | "confirm" | "notfound";

export function ScannerView({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [validCodes, setValidCodes] = useState<string[]>([]);
  const [state, setState] = useState<ScanState>("idle");
  const [candidate, setCandidate] = useState<ScannedSticker | null>(null);
  const [lastRawText, setLastRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Decide o modo e carrega os códigos válidos uma vez.
  useEffect(() => {
    setMode(chooseCaptureMode({ inApp: isInAppBrowser(), hasGetUserMedia: detectCaptureEnv().hasGetUserMedia }));
    const supabase = createClient();
    supabase
      .from("stickers")
      .select("code")
      .then(({ data }) => setValidCodes((data ?? []).map((r) => r.code as string)));
    return () => {
      void terminateOcr();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Liga o stream de vídeo no modo live.
  useEffect(() => {
    if (mode !== "live") return;
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        // Permissão negada / indisponível → cai pra foto.
        setMode("photo");
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const resolveRawText = useCallback(
    async (rawText: string) => {
      setLastRawText(rawText);
      const snap = snapToValidCode(rawText, validCodes);
      if (!snap) {
        setState("notfound");
        return;
      }
      const supabase = createClient();
      const sticker = await lookupStickerByCode(supabase, snap.code, userId);
      if (!sticker) {
        setState("notfound");
        return;
      }
      setCandidate(sticker);
      setState("confirm");
    },
    [validCodes, userId],
  );

  // Captura um frame do vídeo e manda pro OCR.
  const captureFromVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setState("reading");
    const canvas = document.createElement("canvas");
    // Recorta a janela central de mira (60% largura x 30% altura).
    const cropW = video.videoWidth * 0.6;
    const cropH = video.videoHeight * 0.3;
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      video,
      (video.videoWidth - cropW) / 2,
      (video.videoHeight - cropH) / 2,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );
    const { rawText } = await recognizeFrame(canvas);
    await resolveRawText(rawText);
  }, [resolveRawText]);

  // Modo foto: lê o arquivo escolhido.
  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setState("reading");
      const { rawText } = await recognizeFrame(file);
      await resolveRawText(rawText);
    },
    [resolveRawText],
  );

  const backToReading = () => {
    setCandidate(null);
    setState("idle");
  };

  const handleLancar = async () => {
    if (!candidate) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("user_stickers")
      .insert({ user_id: userId, sticker_id: candidate.id })
      .select("id")
      .single();
    const insertedId = data?.id as string | undefined;
    const wasRepeated = candidate.owned_count > 0;
    setSessionCount((n) => n + 1);
    setBusy(false);
    backToReading();
    toast.success(wasRepeated ? "Lançada! (repetida)" : "Lançada!", {
      action: insertedId
        ? {
            label: "Desfazer",
            onClick: async () => {
              await createClient().from("user_stickers").delete().eq("id", insertedId);
              setSessionCount((n) => Math.max(0, n - 1));
              toast.success("Lançamento desfeito");
            },
          }
        : undefined,
    });
  };

  const handleBuscarManual = () => {
    const q = (candidate?.code ?? lastRawText).trim();
    router.push(`/collection?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/collection")}
          className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Coleção
        </button>
        <span className="text-sm text-gray-400">Lançadas nesta sessão: {sessionCount}</span>
      </div>

      <h1 className="text-2xl font-bold text-white">Escanear figurinha</h1>
      <p className="text-sm text-gray-400">Aponte para o código no verso da figurinha.</p>

      {mode === "live" && (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          {/* Janela de mira (60% x 30% central). */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-green-400/80" />
          <button
            onClick={captureFromVideo}
            disabled={state === "reading"}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            Ler código
          </button>
        </div>
      )}

      {mode === "photo" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <button
            onClick={() => {
              if (photoInputRef.current) {
                photoInputRef.current.value = "";
                photoInputRef.current.click();
              }
            }}
            disabled={state === "reading"}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-bold text-zinc-900 disabled:opacity-50"
          >
            {state === "reading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            Tirar foto do código
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {mode === null && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </div>
      )}

      {state === "confirm" && candidate && (
        <ScannerConfirmCard
          sticker={candidate}
          busy={busy}
          onLancar={handleLancar}
          onDescartar={backToReading}
          onBuscarManual={handleBuscarManual}
        />
      )}

      {state === "notfound" && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-300">
            Não consegui ler o código{lastRawText ? ` (li "${lastRawText.trim()}")` : ""}.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={backToReading}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-green-400"
            >
              Tentar de novo
            </button>
            <button
              onClick={handleBuscarManual}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              Buscar manualmente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck e lint**

Run: `npx tsc --noEmit && npx eslint "app/(authenticated)/collection/scanner/scanner-view.tsx"`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): orquestrador com captura híbrida, loop e desfazer"
```

---

### Task 7: Página do scanner (server)

**Files:**
- Create: `app/(authenticated)/collection/scanner/page.tsx`

- [ ] **Step 1: Implementar a página**

Create `app/(authenticated)/collection/scanner/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ScannerView } from "./scanner-view";

export default async function ScannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <ScannerView userId={user!.id} />;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/collection/scanner/page.tsx"
git commit -m "feat(scanner): rota /collection/scanner"
```

---

### Task 8: Botão "Escanear" na Coleção + leitura de `q` na busca

Adiciona o botão de entrada no scanner e faz a busca aceitar o parâmetro `q` (usado pelo "buscar manualmente").

**Files:**
- Modify: `app/(authenticated)/collection/collection-view.tsx`

- [ ] **Step 1: Importar `Link`, `ScanLine` e `useRouter`**

Em `collection-view.tsx`, no topo, adicionar ao import de `next/navigation` e aos imports de ícones:

```tsx
import { useSearchParams, useRouter } from "next/navigation";
```

E no import de `lucide-react` (linha ~20), acrescentar `ScanLine`:

```tsx
import { ChevronsUpDown, Check, Loader2, BookOpen, List, ScanLine } from "lucide-react";
```

- [ ] **Step 2: Inicializar `keyword` a partir de `q`**

Localizar `const initialGroup = searchParams.get("group");` e logo abaixo adicionar:

```tsx
  const router = useRouter();
  const initialKeyword = searchParams.get("q") ?? "";
```

Depois, trocar a inicialização do estado `keyword`:

```tsx
  const [keyword, setKeyword] = useState(initialKeyword);
```

- [ ] **Step 3: Adicionar o botão "Escanear" no header**

Localizar o bloco do título (`<h1 ...>Coleção</h1>` dentro do primeiro `<div>`) e substituir esse `<div>` por:

```tsx
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Coleção</h1>
          <p className="mt-1 text-sm text-gray-400">
            Clique numa figurinha pra adicionar — se já tiver, abre opções de + / − e remover.
          </p>
        </div>
        <button
          onClick={() => router.push("/collection/scanner")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-green-400 transition-colors"
        >
          <ScanLine className="h-4 w-4" /> Escanear
        </button>
      </div>
```

- [ ] **Step 4: Verificar typecheck e lint**

Run: `npx tsc --noEmit && npx eslint "app/(authenticated)/collection/collection-view.tsx"`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add "app/(authenticated)/collection/collection-view.tsx"
git commit -m "feat(collection): botão Escanear e busca via parâmetro q"
```

---

### Task 9: Verificação manual no app

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar a suíte de testes completa**

Run: `npm test`
Expected: PASS — testes de `snap-to-valid-code` (5) e `choose-capture-mode` (3).

- [ ] **Step 2: Subir o app**

Run: `npm run dev`
Acessar `/collection` autenticado.

- [ ] **Step 3: Verificar fluxo no desktop (modo live)**

- Clicar em **Escanear** → cai em `/collection/scanner`, pede permissão de câmera e mostra o visor com a janela de mira.
- Mirar num código (ou imprimir/segurar um verso) → **Ler código** → aparece o cartão com `code`, título e "Você já tem: N".
- **Lançar** → toast "Lançada!" (ou "(repetida)") com **Desfazer**; contador de sessão sobe; volta a ler.
- **Descartar** → volta a ler sem alterar nada.
- Forçar leitura ruim (mirar em algo sem código) → estado "não consegui ler" com **Buscar manualmente** levando a `/collection?q=...`.

- [ ] **Step 4: Verificar fallback de foto**

Abrir `/collection/scanner` em contexto sem `getUserMedia` (ou simular navegador in-app) → deve mostrar **Tirar foto do código** em vez do visor de vídeo, e o resto do fluxo funciona igual.

- [ ] **Step 5: Verificar economia de egress**

Confirmar que nenhuma imagem é enviada ao Supabase Storage durante o scan (só `insert`/`delete` em `user_stickers`). A imagem da figurinha exibida no cartão usa a `image_url` já existente.

---

## Notas de cobertura do spec

- OCR on-device (Tesseract.js): Tasks 0, 4.
- Encaixe na lista de códigos válidos: Task 1; carga dos códigos em Task 6.
- Captura híbrida (live + fallback foto): Tasks 2, 6.
- Cartão de confirmação com status de posse + Lançar/Descartar/Buscar manual: Tasks 5, 6.
- Lançar (aceita repetida) + desfazer + contador de sessão: Task 6.
- Lookup exato sem mudança de schema: Task 3.
- Entrada pela Coleção + busca via `q`: Task 8.
- Verificação manual de fluxo e de egress: Task 9.
```
