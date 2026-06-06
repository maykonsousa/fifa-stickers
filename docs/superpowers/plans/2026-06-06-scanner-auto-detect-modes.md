# Scanner Auto-Detect + Modos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o scanner em hands-free com auto-detect on-device (gatilho gratuito antes da chamada paga ao Vision) e três modos de ação: Lançamento, Troca e Baixa.

**Architecture:** Toda a decisão fica em funções puras testáveis (`resolve-scan-action`, `frame-metrics`, `frame-signal`). O `scanner-view.tsx` faz só plumbing: amostra o vídeo num canvas pequeno em cinza (~6×/s, custo zero), alimenta as métricas na máquina de estados do gatilho e, quando ela manda "fire", chama o Vision uma vez e despacha a ação do modo ativo, com toast "Desfazer" nas ações que mexem na coleção.

**Tech Stack:** Next 16 (client component), React hooks, vitest, Supabase JS, sonner (toast), lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-06-scanner-auto-detect-modes-design.md`

---

## File Structure

| Arquivo | Papel |
|---------|-------|
| **novo** `lib/scanner/resolve-scan-action.ts` | função pura `(mode, ownedCount) → { color, action, message }` |
| **novo** `lib/scanner/resolve-scan-action.test.ts` | testes da matriz modo × ownedCount |
| **novo** `lib/scanner/frame-metrics.ts` | funções puras `toGray`, `meanAbsDiff`, `contentScore` |
| **novo** `lib/scanner/frame-metrics.test.ts` | testes das métricas |
| **novo** `lib/scanner/frame-signal.ts` | máquina de estados pura `nextFrameSignal(state, sample, thresholds)` |
| **novo** `lib/scanner/frame-signal.test.ts` | testes do gatilho |
| **modificar** `app/(authenticated)/collection/scanner/scanner-view.tsx` | seletor de modo, loop de amostragem, dispatch hands-free, undo, flash de cor |
| **possível remoção** `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx` | card de confirmação deixa de ser usado |

---

## Task 1: `resolveScanAction` (função pura)

**Files:**
- Create: `lib/scanner/resolve-scan-action.ts`
- Test: `lib/scanner/resolve-scan-action.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// lib/scanner/resolve-scan-action.test.ts
import { describe, it, expect } from "vitest";
import { resolveScanAction } from "./resolve-scan-action";

describe("resolveScanAction", () => {
  it("lançamento: nova → verde, add, rótulo nova", () => {
    expect(resolveScanAction("lancamento", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova lançada",
    });
  });

  it("lançamento: repetida → verde, add, rótulo repetida", () => {
    expect(resolveScanAction("lancamento", 3)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
    });
  });

  it("troca: não tem → verde, add", () => {
    expect(resolveScanAction("troca", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
    });
  });

  it("troca: já tem → vermelho, none", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "red",
      action: "none",
      message: "Você já tem — pula",
    });
  });

  it("baixa: tem repetida (>=2) → verde, remove", () => {
    expect(resolveScanAction("baixa", 2)).toEqual({
      color: "green",
      action: "remove",
      message: "Baixa dada",
    });
  });

  it("baixa: só a única (==1) → amarelo, none (protege)", () => {
    expect(resolveScanAction("baixa", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Essa é sua única",
    });
  });

  it("baixa: não tem (==0) → vermelho, none", () => {
    expect(resolveScanAction("baixa", 0)).toEqual({
      color: "red",
      action: "none",
      message: "Você não tem essa",
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- resolve-scan-action`
Expected: FAIL — "Failed to resolve import './resolve-scan-action'".

- [ ] **Step 3: Implementar**

```ts
// lib/scanner/resolve-scan-action.ts
// Decide, a partir do modo do scanner e de quantas cópias o usuário já tem,
// a cor do sinal, a ação (mutação) e a mensagem mostrada. Função pura — toda a
// regra de negócio dos modos vive aqui; o scanner-view só executa o resultado.

export type ScanMode = "lancamento" | "troca" | "baixa";
export type ScanColor = "green" | "yellow" | "red";
export type ScanActionKind = "add" | "remove" | "none";

export interface ScanActionResult {
  color: ScanColor;
  action: ScanActionKind;
  message: string;
}

export function resolveScanAction(mode: ScanMode, ownedCount: number): ScanActionResult {
  if (mode === "lancamento") {
    return {
      color: "green",
      action: "add",
      message: ownedCount > 0 ? "Repetida lançada" : "Nova lançada",
    };
  }

  if (mode === "troca") {
    return ownedCount === 0
      ? { color: "green", action: "add", message: "Nova — pega!" }
      : { color: "red", action: "none", message: "Você já tem — pula" };
  }

  // baixa
  if (ownedCount >= 2) return { color: "green", action: "remove", message: "Baixa dada" };
  if (ownedCount === 1) return { color: "yellow", action: "none", message: "Essa é sua única" };
  return { color: "red", action: "none", message: "Você não tem essa" };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- resolve-scan-action`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/resolve-scan-action.ts lib/scanner/resolve-scan-action.test.ts
git commit -m "feat(scanner): resolveScanAction — ação/cor por modo e owned_count"
```

---

## Task 2: `frame-metrics` (métricas puras do frame)

**Files:**
- Create: `lib/scanner/frame-metrics.ts`
- Test: `lib/scanner/frame-metrics.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// lib/scanner/frame-metrics.test.ts
import { describe, it, expect } from "vitest";
import { toGray, meanAbsDiff, contentScore } from "./frame-metrics";

describe("toGray", () => {
  it("converte RGBA em um byte de luminância por pixel", () => {
    // 2 pixels: preto e branco (RGBA).
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const gray = toGray(rgba);
    expect(gray.length).toBe(2);
    expect(gray[0]).toBe(0);
    expect(gray[1]).toBe(255);
  });
});

describe("meanAbsDiff", () => {
  it("é 0 para arrays iguais", () => {
    const a = new Uint8Array([10, 20, 30]);
    expect(meanAbsDiff(a, new Uint8Array([10, 20, 30]))).toBe(0);
  });

  it("é a média das diferenças absolutas", () => {
    const a = new Uint8Array([0, 0, 0]);
    const b = new Uint8Array([30, 0, 0]);
    expect(meanAbsDiff(a, b)).toBe(10); // (30+0+0)/3
  });

  it("é Infinity se os tamanhos diferem (frame incomparável)", () => {
    expect(meanAbsDiff(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(Infinity);
  });
});

describe("contentScore", () => {
  it("é 0 para superfície uniforme (sem conteúdo)", () => {
    expect(contentScore(new Uint8Array([100, 100, 100, 100]))).toBe(0);
  });

  it("é alto quando há contraste (preto e branco)", () => {
    const score = contentScore(new Uint8Array([0, 255, 0, 255]));
    expect(score).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- frame-metrics`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implementar**

```ts
// lib/scanner/frame-metrics.ts
// Métricas puras sobre um frame já reduzido a tons de cinza. Usadas pelo loop do
// scanner pra decidir, sem custo, quando vale chamar o Vision (ver frame-signal).

// Converte um buffer RGBA (4 bytes/pixel, vindo de canvas.getImageData) em um
// byte de luminância por pixel. Luminância perceptual (Rec. 601).
export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    out[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

// Diferença média absoluta pixel a pixel entre dois frames cinza. Tamanhos
// diferentes → Infinity (não dá pra comparar; tratado como "mudou totalmente").
export function meanAbsDiff(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// "Quanta informação tem na mira" = desvio-padrão da luminância. Superfície lisa
// (mesa vazia) ~0; figurinha com texto/figura → alto.
export function contentScore(gray: Uint8Array): number {
  if (gray.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < gray.length; i++) mean += gray[i];
  mean /= gray.length;
  let variance = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i] - mean;
    variance += d * d;
  }
  return variance / gray.length;
}
```

> Nota: `contentScore` devolve **variância** (não desvio-padrão). O teste "preto e branco" → variância `((0-127.5)²+(255-127.5)²+...)/4 ≈ 16256`, bem acima de 100. O limiar em `frame-signal` é calibrado contra esta escala.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- frame-metrics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/frame-metrics.ts lib/scanner/frame-metrics.test.ts
git commit -m "feat(scanner): frame-metrics — toGray, meanAbsDiff, contentScore"
```

---

## Task 3: `frame-signal` (máquina de estados do gatilho)

**Files:**
- Create: `lib/scanner/frame-signal.ts`
- Test: `lib/scanner/frame-signal.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// lib/scanner/frame-signal.test.ts
import { describe, it, expect } from "vitest";
import { nextFrameSignal, initialFrameState, type FrameThresholds } from "./frame-signal";

const T: FrameThresholds = { diff: 6, content: 100, rearmDiff: 14, stableSamples: 3 };

describe("nextFrameSignal — searching", () => {
  it("dispara após N amostras estáveis e com conteúdo", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // 1ª estável
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 2ª
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 3ª → fire
    expect(d.kind).toBe("fire");
    expect(d.state.phase).toBe("rearm");
  });

  it("não dispara se estável mas sem conteúdo (mesa vazia)", () => {
    let state = initialFrameState();
    const empty = { diffFromPrev: 1, content: 10, diffFromLastRead: null };
    for (let i = 0; i < 5; i++) {
      const d = nextFrameSignal(state, empty, T);
      expect(d.kind).toBe("wait");
      state = d.state;
    }
  });

  it("zera a contagem quando o frame se mexe (instável)", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, diffFromLastRead: null };
    const moving = { diffFromPrev: 40, content: 5000, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // count 1
    d = nextFrameSignal(d.state, moving, T); // reseta
    expect(d.state.stableCount).toBe(0);
    d = nextFrameSignal(d.state, stable, T); // count 1 de novo
    d = nextFrameSignal(d.state, stable, T); // 2
    d = nextFrameSignal(d.state, stable, T); // 3 → fire
    expect(d.kind).toBe("fire");
  });
});

describe("nextFrameSignal — rearm", () => {
  it("fica em rearm enquanto o frame não mudar do último lido", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const same = { diffFromPrev: 1, content: 5000, diffFromLastRead: 3 };
    const d = nextFrameSignal(state, same, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("rearm");
  });

  it("volta a searching quando o frame muda bastante (trocou a figurinha)", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const changed = { diffFromPrev: 30, content: 5000, diffFromLastRead: 50 };
    const d = nextFrameSignal(state, changed, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("searching");
    expect(d.state.stableCount).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- frame-signal`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implementar**

```ts
// lib/scanner/frame-signal.ts
// Máquina de estados pura do gatilho on-device. Recebe métricas baratas de cada
// amostra de frame (ver frame-metrics) e decide quando vale gastar UMA chamada
// paga ao Vision. Garante ~1 chamada por figurinha:
//   searching → acumula amostras estáveis e com conteúdo → "fire" → rearm
//   rearm     → espera o frame mudar do último lido (figurinha saiu) → searching
// Quem chama atualiza a "assinatura do último lido" no momento do fire.

export type FramePhase = "searching" | "rearm";

export interface FrameThresholds {
  diff: number; // diffFromPrev <= diff → estável
  content: number; // content >= content → tem conteúdo na mira
  rearmDiff: number; // diffFromLastRead >= rearmDiff → figurinha trocou
  stableSamples: number; // nº de amostras estáveis seguidas pra disparar
}

export interface FrameSample {
  diffFromPrev: number; // diff vs amostra anterior
  content: number; // contraste/variância da mira
  diffFromLastRead: number | null; // diff vs assinatura do último lido (null se nunca leu)
}

export interface FrameState {
  phase: FramePhase;
  stableCount: number;
}

export type FrameDecision =
  | { kind: "wait"; state: FrameState }
  | { kind: "fire"; state: FrameState };

export function initialFrameState(): FrameState {
  return { phase: "searching", stableCount: 0 };
}

export function nextFrameSignal(
  state: FrameState,
  sample: FrameSample,
  t: FrameThresholds,
): FrameDecision {
  if (state.phase === "rearm") {
    const moved = sample.diffFromLastRead !== null && sample.diffFromLastRead >= t.rearmDiff;
    if (moved) return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
    return { kind: "wait", state };
  }

  // searching
  const stable = sample.diffFromPrev <= t.diff;
  const hasContent = sample.content >= t.content;
  if (!stable || !hasContent) {
    return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
  }

  const stableCount = state.stableCount + 1;
  if (stableCount >= t.stableSamples) {
    return { kind: "fire", state: { phase: "rearm", stableCount: 0 } };
  }
  return { kind: "wait", state: { phase: "searching", stableCount } };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- frame-signal`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/frame-signal.ts lib/scanner/frame-signal.test.ts
git commit -m "feat(scanner): frame-signal — máquina de estados do gatilho on-device"
```

---

## Task 4: Seletor de modo (segmented control)

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

Adiciona o estado de modo e o seletor visual, sem mudar ainda o comportamento de leitura (isso vem nas Tasks 5–7). Padrão: Lançamento.

- [ ] **Step 1: Importar o tipo e adicionar estado**

No topo do arquivo, junto aos outros imports de `lib/scanner`:

```ts
import { resolveScanAction, type ScanMode } from "@/lib/scanner/resolve-scan-action";
```

Dentro do componente, junto aos outros `useState` (após `const [scanMode...]` não existe ainda — criar):

```ts
  const [scanMode, setScanMode] = useState<ScanMode>("lancamento");
```

- [ ] **Step 2: Renderizar o segmented control**

Logo abaixo do `<h1>Escanear figurinha</h1>` e antes do `<p>` de instrução, inserir:

```tsx
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-1">
        {([
          ["lancamento", "Lançamento"],
          ["troca", "Troca"],
          ["baixa", "Baixa"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setScanMode(value)}
            className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
              scanMode === value ? "bg-green-500 text-zinc-900" : "text-gray-300 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
```

- [ ] **Step 3: Verificar build/lint**

Run: `npm run lint && npx tsc --noEmit`
Expected: sem erros. (`scanMode` ainda não é lido fora do seletor — ok, será nas próximas tasks. Se o lint reclamar de variável não usada, segue, pois Task 5 a consome.)

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`, abrir `/collection/scanner`. Esperado: três botões no topo; "Lançamento" destacado em verde por padrão; clicar troca o destaque.

- [ ] **Step 5: Commit**

```bash
git add app/(authenticated)/collection/scanner/scanner-view.tsx
git commit -m "feat(scanner): seletor de modo (lançamento/troca/baixa)"
```

---

## Task 5: Loop de auto-detect + dispatch hands-free (modo live)

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

Esta task substitui o botão "Ler código" pelo loop automático e troca o card de confirmação por execução hands-free com flash de cor + toast "Desfazer".

> **Antes de começar:** ler `node_modules/next/dist/docs/` apenas se precisar de algo específico de client components nesta versão do Next. As mudanças aqui são React puro (hooks/refs/canvas), sem novas APIs do Next.

- [ ] **Step 1: Imports das funções puras**

Adicionar aos imports de `lib/scanner`:

```ts
import { toGray, meanAbsDiff, contentScore } from "@/lib/scanner/frame-metrics";
import { nextFrameSignal, initialFrameState, type FrameThresholds, type FrameState } from "@/lib/scanner/frame-signal";
```

- [ ] **Step 2: Constantes de calibração**

Abaixo da constante `MIRA`:

```ts
// Amostragem on-device do gatilho. Tamanho pequeno = barato. Limiares calibrados
// contra a escala de contentScore (variância de luminância 0–~16k). Ajustar em
// dispositivo se disparar cedo/tarde demais.
const SAMPLE = { w: 64, h: 48 };
const SAMPLE_MS = 170; // ~6 amostras/s
const THRESHOLDS: FrameThresholds = {
  diff: 6,
  content: 400,
  rearmDiff: 14,
  stableSamples: 3,
};
```

- [ ] **Step 3: Refs do loop e estado de flash**

Junto aos outros refs/states do componente:

```ts
  const [flash, setFlash] = useState<{ color: "green" | "yellow" | "red"; text: string } | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevSampleRef = useRef<Uint8Array | null>(null);
  const lastReadSampleRef = useRef<Uint8Array | null>(null);
  const signalStateRef = useRef<FrameState>(initialFrameState());
  const readingRef = useRef(false);
  const scanModeRef = useRef(scanMode);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 4: Espelhar scanMode num ref e resetar estado transitório ao trocar de modo**

Adicionar este efeito (mantém o loop estável sem reiniciá-lo a cada troca de modo, e reseta o gatilho conforme o spec):

```ts
  useEffect(() => {
    scanModeRef.current = scanMode;
    signalStateRef.current = initialFrameState();
    prevSampleRef.current = null;
    lastReadSampleRef.current = null;
  }, [scanMode]);
```

- [ ] **Step 5: Função de flash**

Adicionar um helper que mostra o flash por ~1,2s:

```ts
  const showFlash = useCallback((color: "green" | "yellow" | "red", text: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ color, text });
    flashTimerRef.current = setTimeout(() => setFlash(null), 1200);
  }, []);
```

- [ ] **Step 6: Dispatch da ação por modo (substitui o fluxo de confirm)**

Adicionar `runScan`, que recebe a figurinha resolvida e executa a ação do modo ativo (lido via ref):

```ts
  const runScan = useCallback(
    async (sticker: ScannedSticker) => {
      const { color, action, message } = resolveScanAction(scanModeRef.current, sticker.owned_count);
      showFlash(color, `${sticker.code} — ${message}`);
      const supabase = createClient();

      if (action === "add") {
        const { data } = await supabase
          .from("user_stickers")
          .insert({ user_id: userId, sticker_id: sticker.id })
          .select("id")
          .single();
        const insertedId = data?.id as string | undefined;
        setSessionCount((n) => n + 1);
        toast.success(message, {
          action: insertedId
            ? {
                label: "Desfazer",
                onClick: async () => {
                  await createClient().from("user_stickers").delete().eq("id", insertedId);
                  setSessionCount((n) => Math.max(0, n - 1));
                  toast.success("Desfeito");
                },
              }
            : undefined,
        });
      } else if (action === "remove") {
        const { data: rows } = await supabase
          .from("user_stickers")
          .select("id")
          .eq("user_id", userId)
          .eq("sticker_id", sticker.id)
          .limit(1);
        const rowId = rows?.[0]?.id as string | undefined;
        if (rowId) {
          await supabase.from("user_stickers").delete().eq("id", rowId);
          setSessionCount((n) => n + 1);
          toast.success(message, {
            action: {
              label: "Desfazer",
              onClick: async () => {
                await createClient()
                  .from("user_stickers")
                  .insert({ user_id: userId, sticker_id: sticker.id });
                setSessionCount((n) => Math.max(0, n - 1));
                toast.success("Desfeito");
              },
            },
          });
        }
      }
      // action === "none": só o flash de cor + mensagem, sem mutação.
    },
    [userId, showFlash],
  );
```

- [ ] **Step 7: Captura automática (resolve o código e chama runScan)**

Adicionar `autoCapture`, baseada na `captureFromVideo` atual mas hands-free (sem `setState("reading"/"confirm")`):

```ts
  const autoCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    try {
      const sw = video.videoWidth * MIRA.w;
      const sh = video.videoHeight * MIRA.h;
      const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, {
        sx: (video.videoWidth - sw) / 2,
        sy: (video.videoHeight - sh) / 2,
        sw,
        sh,
      });
      const rawText = await recognizeFrame(image);
      setLastRawText(rawText);
      const snap = findCodeInText(rawText, validCodes);
      if (!snap) {
        showFlash("red", "Não consegui ler");
        return;
      }
      const sticker = await lookupStickerByCode(createClient(), snap.code, userId);
      if (!sticker) {
        showFlash("red", "Código não encontrado");
        return;
      }
      await runScan(sticker);
    } catch {
      showFlash("red", "Não consegui ler");
    }
  }, [validCodes, userId, runScan, showFlash]);
```

- [ ] **Step 8: O loop de amostragem**

Adicionar o efeito que amostra o vídeo e dispara via `nextFrameSignal`:

```ts
  useEffect(() => {
    if (mode !== "live" || !codesReady) return;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || readingRef.current) return;

      const canvas = sampleCanvasRef.current ?? document.createElement("canvas");
      sampleCanvasRef.current = canvas;
      canvas.width = SAMPLE.w;
      canvas.height = SAMPLE.h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const sw = video.videoWidth * MIRA.w;
      const sh = video.videoHeight * MIRA.h;
      ctx.drawImage(
        video,
        (video.videoWidth - sw) / 2,
        (video.videoHeight - sh) / 2,
        sw,
        sh,
        0,
        0,
        SAMPLE.w,
        SAMPLE.h,
      );
      const gray = toGray(ctx.getImageData(0, 0, SAMPLE.w, SAMPLE.h).data);
      const prev = prevSampleRef.current;
      const lastRead = lastReadSampleRef.current;
      const decision = nextFrameSignal(
        signalStateRef.current,
        {
          diffFromPrev: prev ? meanAbsDiff(gray, prev) : Infinity,
          content: contentScore(gray),
          diffFromLastRead: lastRead ? meanAbsDiff(gray, lastRead) : null,
        },
        THRESHOLDS,
      );
      prevSampleRef.current = gray;
      signalStateRef.current = decision.state;

      if (decision.kind === "fire") {
        lastReadSampleRef.current = gray;
        readingRef.current = true;
        void autoCapture().finally(() => {
          readingRef.current = false;
        });
      }
    }, SAMPLE_MS);
    return () => clearInterval(timer);
  }, [mode, codesReady, autoCapture]);
```

- [ ] **Step 9: Substituir o botão "Ler código" por uma faixa de status + flash na borda da mira**

No bloco `{mode === "live" && (...)}`, trocar a borda fixa da mira por uma colorida pelo flash, e remover o `<button onClick={captureFromVideo}>`. A mira passa a ser:

```tsx
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 transition-colors ${
              flash?.color === "green"
                ? "border-green-400"
                : flash?.color === "yellow"
                  ? "border-yellow-400"
                  : flash?.color === "red"
                    ? "border-red-500"
                    : "border-green-400/60"
            }`}
            style={{ width: `${MIRA.w * 100}%`, height: `${MIRA.h * 100}%` }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white">
            {!codesReady ? "Carregando…" : flash ? flash.text : "Procurando figurinha…"}
          </div>
```

- [ ] **Step 10: Remover o estado de confirmação agora morto (live)**

Remover do componente: o estado `candidate`/`state`/`busy` ligados ao card, a `captureFromVideo`, a `resolveRawText`, `backToReading`, `handleLancar`, `handleBuscarManual`, e os blocos JSX `{state === "confirm" ...}` e `{state === "notfound" ...}`, **somente após** a Task 6 cobrir o modo foto. Para esta task, manter `handlePhoto` funcionando (Task 6 o reescreve). Se algo do card ainda for referenciado pelo modo foto, deixar para a Task 6.

> Para manter esta task compilando: por ora **manter** `ScanState`, `state`, `candidate`, `busy`, `resolveRawText`, `captureFromVideo` e os blocos `confirm`/`notfound` no JSX (eles deixam de aparecer no live porque o botão sumiu). A limpeza final acontece na Task 6, depois que o modo foto também for hands-free. Isto evita um commit que não compila.

- [ ] **Step 11: Verificar build/lint**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: sem erros; testes passam.

- [ ] **Step 12: Verificação manual (live)**

Run: `npm run dev`, abrir `/collection/scanner` num device/emulador com câmera. Enquadrar uma figurinha e segurar ~0,5s → flash verde + nome + toast "Desfazer", sem clicar. Tirar a figurinha e enquadrar outra → nova leitura. Trocar pra Troca/Baixa → cores/ações conforme a tabela do spec. Confirmar no Network que **1** request a `/api/scanner/ocr` por figurinha (não em rajada).

- [ ] **Step 13: Commit**

```bash
git add app/(authenticated)/collection/scanner/scanner-view.tsx
git commit -m "feat(scanner): auto-detect hands-free no modo live (gatilho on-device + dispatch por modo)"
```

---

## Task 6: Modo foto aplica a ação do modo + limpeza do fluxo antigo

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`
- Possible delete: `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx`

- [ ] **Step 1: Reescrever `handlePhoto` para usar o dispatch por modo**

Substituir o corpo de `handlePhoto` para resolver o código e chamar `runScan` (mesma ação/cor/undo do live; gatilho manual):

```ts
  const handlePhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const img = await loadImage(file);
        const image = cropToJpegBase64(img, img.naturalWidth, img.naturalHeight);
        const rawText = await recognizeFrame(image);
        setLastRawText(rawText);
        const snap = findCodeInText(rawText, validCodes);
        if (!snap) {
          showFlash("red", "Não consegui ler");
          return;
        }
        const sticker = await lookupStickerByCode(createClient(), snap.code, userId);
        if (!sticker) {
          showFlash("red", "Código não encontrado");
          return;
        }
        await runScan(sticker);
      } catch {
        showFlash("red", "Não consegui ler");
      }
    },
    [validCodes, userId, runScan, showFlash],
  );
```

- [ ] **Step 2: Mostrar o flash também no modo foto**

No bloco `{mode === "photo" && (...)}`, abaixo do botão "Tirar foto", adicionar a faixa de status:

```tsx
          {flash && (
            <p
              className={`mt-3 text-sm font-medium ${
                flash.color === "green"
                  ? "text-green-400"
                  : flash.color === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {flash.text}
            </p>
          )}
```

- [ ] **Step 3: Remover o fluxo de confirmação morto**

Agora que live e foto são hands-free, remover do `scanner-view.tsx`:
- o tipo `ScanState` e o estado `const [state, setState] = useState<ScanState>(...)`;
- `const [candidate, setCandidate] = ...` e `const [busy, setBusy] = ...`;
- as funções `resolveRawText`, `captureFromVideo`, `backToReading`, `handleLancar`, `handleBuscarManual`;
- os blocos JSX `{state === "confirm" && ...}` e `{state === "notfound" && ...}`;
- o import de `ScannerConfirmCard`.

Manter: `lastRawText`/`setLastRawText` (usado nos dispatches), `sessionCount`, `validCodes`, `mode`.

- [ ] **Step 4: Remover o componente do card se ficou órfão**

Run: `grep -rn "ScannerConfirmCard\|scanner-confirm-card" app lib`
Expected: nenhuma referência. Se confirmado:

```bash
git rm app/(authenticated)/collection/scanner/scanner-confirm-card.tsx
```

Se ainda houver referência, não remover e investigar.

- [ ] **Step 5: Verificar build/lint/testes**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: sem erros; sem variáveis/imports não usados; testes passam.

- [ ] **Step 6: Verificação manual (foto)**

Forçar o modo foto (abrir num in-app browser, ou setar `mode` "photo" temporariamente). Selecionar os três modos e tirar foto de uma figurinha → ação/cor/undo conforme a tabela. Esperado: mesmo comportamento do live, gatilho manual.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(scanner): modo foto aplica ação do modo + remove fluxo de confirmação antigo"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Seletor de modo (segmented control, padrão Lançamento) → Task 4. ✓
- Tabela de ações por modo × owned_count (incl. amarelo/proteção da única) → Task 1 + Task 5/6. ✓
- Gatilho on-device estabilidade+conteúdo, ~1 chamada/figurinha, rearm → Tasks 2, 3, 5. ✓
- Hands-free + toast "Desfazer" (add e remove) → Task 5. ✓
- Falha de leitura sem card bloqueante → Tasks 5/6 (flash vermelho). ✓
- Modo foto com os modos, gatilho manual → Task 6. ✓
- Reset de estado transitório ao trocar de modo → Task 5 Step 4. ✓
- Funções puras testáveis (`frame-signal`, `resolve-scan-action`, + `frame-metrics`) → Tasks 1–3. ✓

**Placeholder scan:** sem TBD/TODO; todo passo de código tem código completo; limiares numéricos são valores concretos com nota de calibração (não placeholders).

**Type consistency:** `ScanMode` ("lancamento"|"troca"|"baixa") consistente entre Task 1, 4, 5. `resolveScanAction` retorna `{color, action, message}` usado igual na Task 5/6. `FrameState`/`nextFrameSignal`/`initialFrameState`/`FrameThresholds` consistentes entre Task 3 e Task 5. `toGray`/`meanAbsDiff`/`contentScore` consistentes entre Task 2 e Task 5.

**Nota de ordem:** Task 5 deixa o fluxo antigo vivo (porém oculto no live) de propósito para cada commit compilar; a remoção acontece na Task 6 depois que o modo foto migra. Implementar 5 e 6 em sequência.
