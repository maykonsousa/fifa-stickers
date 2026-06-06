# Scanner UI: bottom-sheet de confirmação + vídeo enxuto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o card de confirmação (e o manual) aparecerem como bottom-sheet sempre visível, e limitar a altura do vídeo, mantendo a mira alinhada ao recorte do OCR.

**Architecture:** Uma função pura nova (`cover-crop-region.ts`) calcula o recorte do OCR a partir da região realmente visível do vídeo (`object-cover`), generalizando o recorte atual. Um wrapper presentational (`bottom-sheet.tsx`) ancora conteúdo na base da viewport com scrim. O `scanner-view.tsx` passa a usar os dois e a limitar a altura do vídeo.

**Tech Stack:** Next 16 client component, React, vitest (node env), Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-06-scanner-ui-bottom-sheet-design.md`

---

## File Structure

| Arquivo | Papel |
|---------|-------|
| **novo** `lib/scanner/cover-crop-region.ts` | função pura: mira → região de recorte alinhada ao `object-cover` |
| **novo** `lib/scanner/cover-crop-region.test.ts` | testes |
| **novo** `app/(authenticated)/collection/scanner/bottom-sheet.tsx` | wrapper presentational (scrim + sheet) |
| **modificar** `app/(authenticated)/collection/scanner/scanner-view.tsx` | usa coverCropRegion no loop e no autoCapture; limita altura do vídeo; envolve card/manual no BottomSheet |
| **sem mudança** | `crop-frame.ts` (reusa o tipo `CropRegion`), `scanner-confirm-card.tsx`, modo foto |

---

## Task 1: `coverCropRegion` (função pura)

**Files:**
- Create: `lib/scanner/cover-crop-region.ts`
- Test: `lib/scanner/cover-crop-region.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// lib/scanner/cover-crop-region.test.ts
import { describe, it, expect } from "vitest";
import { coverCropRegion } from "./cover-crop-region";

describe("coverCropRegion", () => {
  it("caixa com a mesma proporção do frame → recorte igual a MIRA × intrínseco", () => {
    // frame 1000x750 (4:3), caixa 400x300 (4:3), mira 0.8 x 0.6
    expect(coverCropRegion(1000, 750, 400, 300, 0.8, 0.6)).toEqual({
      sx: 100,
      sy: 150,
      sw: 800,
      sh: 450,
    });
  });

  it("caixa mais baixa que o frame (corte vertical) → sh menor, centrado", () => {
    // frame 1000x1000, caixa 400x200; s = max(0.4, 0.2) = 0.4
    expect(coverCropRegion(1000, 1000, 400, 200, 0.8, 0.6)).toEqual({
      sx: 100, // (1000 - 800)/2
      sy: 350, // (1000 - 300)/2
      sw: 800, // 0.8 * 400 / 0.4
      sh: 300, // 0.6 * 200 / 0.4
    });
  });

  it("caixa com dimensão 0 (layout ainda não medido) → fallback MIRA × intrínseco, sem NaN", () => {
    expect(coverCropRegion(1000, 750, 0, 0, 0.8, 0.6)).toEqual({
      sx: 100,
      sy: 150,
      sw: 800,
      sh: 450,
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- cover-crop-region`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implementar**

```ts
// lib/scanner/cover-crop-region.ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- cover-crop-region`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/cover-crop-region.ts lib/scanner/cover-crop-region.test.ts
git commit -m "feat(scanner): coverCropRegion — recorte alinhado ao object-cover"
```

---

## Task 2: componente `BottomSheet` (presentational)

**Files:**
- Create: `app/(authenticated)/collection/scanner/bottom-sheet.tsx`

Sem teste de DOM (repo não tem testing-library). Verificado por `tsc`/`eslint` e manual.

- [ ] **Step 1: Implementar**

```tsx
// app/(authenticated)/collection/scanner/bottom-sheet.tsx
"use client";

import type { ReactNode } from "react";

// Ancora o conteúdo na base da viewport, sempre visível (independe de scroll),
// com um scrim escurecendo o resto. O scrim NÃO fecha ao toque — a decisão da
// confirmação é explícita (botões do conteúdo). Mobile-first, centralizado e
// limitado à largura do container em telas largas.
export function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npx eslint "app/(authenticated)/collection/scanner/bottom-sheet.tsx" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/collection/scanner/bottom-sheet.tsx"
git commit -m "feat(scanner): wrapper BottomSheet (scrim + sheet fixo na base)"
```

---

## Task 3: ligar no scanner-view (vídeo enxuto + recorte alinhado + bottom-sheet)

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

- [ ] **Step 1: Imports.** Junto aos imports de `@/lib/scanner` e do diretório:

```ts
import { coverCropRegion } from "@/lib/scanner/cover-crop-region";
import { BottomSheet } from "./bottom-sheet";
```

- [ ] **Step 2: Recorte alinhado no `autoCapture`.** Substituir o corpo do `try` de `autoCapture` (o cálculo `sw`/`sh` + `cropToJpegBase64`) por:

```ts
    try {
      const region = coverCropRegion(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
        MIRA.w,
        MIRA.h,
      );
      const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, region);
      await resolveAndRun(image, captureMode);
    } catch {
      showFlash("red", "Não consegui ler");
    }
```

- [ ] **Step 3: Recorte alinhado no loop de amostragem.** No `setInterval`, substituir o cálculo `sw`/`sh` + `ctx.drawImage(...)` por:

```ts
      const region = coverCropRegion(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
        MIRA.w,
        MIRA.h,
      );
      ctx.drawImage(
        video,
        region.sx,
        region.sy,
        region.sw,
        region.sh,
        0,
        0,
        SAMPLE.w,
        SAMPLE.h,
      );
```

- [ ] **Step 4: Limitar a altura do vídeo.** Trocar a tag do vídeo:

```tsx
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
```

por:

```tsx
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[52vh] w-full object-cover"
          />
```

- [ ] **Step 5: Envolver o card de confirmação no BottomSheet.** Trocar:

```tsx
      {phase.kind === "confirming" && (
        <ScannerConfirmCard
          sticker={phase.sticker}
          result={resolveScanAction(phase.mode, phase.sticker.owned_count)}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onReject={() => dispatch({ type: "reject" })}
          onManual={() => dispatch({ type: "openManual" })}
        />
      )}
```

por:

```tsx
      {phase.kind === "confirming" && (
        <BottomSheet>
          <ScannerConfirmCard
            sticker={phase.sticker}
            result={resolveScanAction(phase.mode, phase.sticker.owned_count)}
            busy={confirmBusy}
            onConfirm={handleConfirm}
            onReject={() => dispatch({ type: "reject" })}
            onManual={() => dispatch({ type: "openManual" })}
          />
        </BottomSheet>
      )}
```

- [ ] **Step 6: Envolver o bloco manual no BottomSheet.** Localizar o bloco `{phase.kind === "manual" && ( <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4"> … </div> )}` e envolvê-lo: trocar a abertura `{phase.kind === "manual" && (` + `<div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4">` por:

```tsx
      {phase.kind === "manual" && (
        <BottomSheet>
          <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4">
```

e o fechamento correspondente do bloco (o `</div>` final do bloco manual seguido de `)}`) por:

```tsx
          </div>
        </BottomSheet>
      )}
```

(Não alterar o conteúdo interno do bloco manual — só envolver com `<BottomSheet>`.)

- [ ] **Step 7: Verificar build/lint/testes**

Run: `npx eslint "app/(authenticated)/collection/scanner/scanner-view.tsx" && npx tsc --noEmit && npm test`
Expected: sem erros; todos os testes passam.

- [ ] **Step 8: Verificação manual**

Run: `npm run dev`. No modo live: o vídeo fica mais baixo (≤52vh). Enquadrar uma figurinha → o card sobe como **bottom-sheet** na base, com o resto escurecido, **sem precisar rolar**. A caixa de mira verde corresponde ao que é lido (testar com o código posicionado nas bordas da mira). "Digitar código" → o manual também aparece como sheet. No modo foto, o flash/erro continua aparecendo; o manual via "Não leu? Digitar código" sobe como sheet.

- [ ] **Step 9: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): card/manual em bottom-sheet + vídeo com altura limitada"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Card + manual como bottom-sheet sempre visível, scrim não-fechável → Task 2 + Task 3 (Steps 5–6). ✓
- Vídeo com altura limitada (`max-h-[52vh]` + `object-cover`) → Task 3 Step 4. ✓
- Alinhamento mira↔recorte via função pura, usada no loop e no autoCapture → Task 1 + Task 3 (Steps 2–3). ✓
- Generaliza o recorte atual (caixa proporcional = comportamento de hoje) → Task 1 (teste 1). ✓
- Fallback sem NaN quando a caixa não foi medida → Task 1 (teste 3 + guarda `boxW/boxH <= 0`). ✓
- Modo foto inalterado (recorta imagem inteira) → não tocado. ✓
- Safe-area no sheet → Task 2 (`pb-[calc(...env(safe-area-inset-bottom))]`). ✓

**Placeholder scan:** sem TBD/TODO; todo passo com código completo. `max-h-[52vh]` e `max-w-md` são valores concretos (calibráveis em device, mas não são placeholders).

**Type consistency:** `coverCropRegion(videoW, videoH, boxW, boxH, miraW, miraH) → CropRegion` consistente entre Task 1 e os dois usos na Task 3. `CropRegion` reusado de `crop-frame.ts` (mesmo `{sx,sy,sw,sh}` que `cropToJpegBase64` consome). `BottomSheet` com `children` usado igual nas duas envolturas.
