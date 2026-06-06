# Scanner: confirmação por figurinha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inserir um passo de confirmação visual por figurinha (imagem + código + nome) antes de qualquer ação do scanner, com saída por entrada manual de código quando o OCR erra.

**Architecture:** A transição de telas vira um redutor puro testável (`scan-flow.ts`: searching → confirming → searching, mais manual). O `scanner-view.tsx` usa `useReducer`, pausa o loop de amostragem enquanto confirma/digita, e só executa a mutação no "É essa". Um card presentational (`scanner-confirm-card.tsx`) mostra a figurinha identificada. Funções puras existentes (`resolveScanAction`, `frame-*`) não mudam.

**Tech Stack:** Next 16 client component, React `useReducer`/hooks, vitest (environment node — sem testes de DOM), Supabase JS, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-06-scanner-confirmacao-leitura-design.md`

---

## File Structure

| Arquivo | Papel |
|---------|-------|
| **novo** `lib/scanner/scan-flow.ts` | redutor puro da máquina de estados de confirmação + tipos `ScanPhase`/`ScanFlowEvent` |
| **novo** `lib/scanner/scan-flow.test.ts` | testes das transições |
| **recriar** `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx` | card presentational dirigido por props (sticker + resultado da ação) |
| **modificar** `app/(authenticated)/collection/scanner/scanner-view.tsx` | usa o redutor; pausa o loop; executa ação no confirm; entrada manual |
| **sem mudança** | `resolveScanAction`, `frame-metrics`, `frame-signal`, rota OCR |

---

## Task 1: redutor de fluxo `scan-flow` (puro)

**Files:**
- Create: `lib/scanner/scan-flow.ts`
- Test: `lib/scanner/scan-flow.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// lib/scanner/scan-flow.test.ts
import { describe, it, expect } from "vitest";
import { scanFlowReducer, initialScanPhase, type ScanPhase } from "./scan-flow";
import type { ScannedSticker } from "./lookup-sticker-by-code";

const STICKER: ScannedSticker = {
  id: 1,
  code: "MEX1",
  title: "México",
  image_url: null,
  owned_count: 0,
};

describe("scanFlowReducer", () => {
  it("começa procurando", () => {
    expect(initialScanPhase).toEqual({ kind: "searching" });
  });

  it("searching + resolved → confirming com sticker e modo", () => {
    const next = scanFlowReducer(initialScanPhase, {
      type: "resolved",
      sticker: STICKER,
      mode: "lancamento",
    });
    expect(next).toEqual({ kind: "confirming", sticker: STICKER, mode: "lancamento" });
  });

  it("confirming + confirm → searching", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "troca" };
    expect(scanFlowReducer(phase, { type: "confirm" })).toEqual({ kind: "searching" });
  });

  it("confirming + reject → searching", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "troca" };
    expect(scanFlowReducer(phase, { type: "reject" })).toEqual({ kind: "searching" });
  });

  it("confirming + openManual → manual", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "baixa" };
    expect(scanFlowReducer(phase, { type: "openManual" })).toEqual({ kind: "manual" });
  });

  it("searching + openManual → manual", () => {
    expect(scanFlowReducer(initialScanPhase, { type: "openManual" })).toEqual({ kind: "manual" });
  });

  it("manual + manualResolved → confirming", () => {
    const phase: ScanPhase = { kind: "manual" };
    const next = scanFlowReducer(phase, {
      type: "manualResolved",
      sticker: STICKER,
      mode: "baixa",
    });
    expect(next).toEqual({ kind: "confirming", sticker: STICKER, mode: "baixa" });
  });

  it("manual + closeManual → searching", () => {
    expect(scanFlowReducer({ kind: "manual" }, { type: "closeManual" })).toEqual({
      kind: "searching",
    });
  });

  it("ignora resolved fora de searching (não atropela uma confirmação aberta)", () => {
    const phase: ScanPhase = { kind: "confirming", sticker: STICKER, mode: "lancamento" };
    expect(scanFlowReducer(phase, { type: "resolved", sticker: STICKER, mode: "troca" })).toBe(
      phase,
    );
  });

  it("ignora confirm quando não está confirmando", () => {
    expect(scanFlowReducer(initialScanPhase, { type: "confirm" })).toBe(initialScanPhase);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- scan-flow`
Expected: FAIL — import não resolve.

- [ ] **Step 3: Implementar**

```ts
// lib/scanner/scan-flow.ts
// Máquina de estados pura do fluxo de confirmação do scanner. Isola as transições
// de tela (procurando → confirmando → procurando, mais entrada manual) do plumbing
// de React/Supabase do scanner-view, pra ficar testável sem DOM. A MUTAÇÃO em si
// (lançar/baixa) não acontece aqui — é o scanner-view que executa no evento "confirm".
import type { ScannedSticker } from "./lookup-sticker-by-code";
import type { ScanMode } from "./resolve-scan-action";

export type ScanPhase =
  | { kind: "searching" }
  | { kind: "confirming"; sticker: ScannedSticker; mode: ScanMode }
  | { kind: "manual" };

export type ScanFlowEvent =
  | { type: "resolved"; sticker: ScannedSticker; mode: ScanMode } // leitura achou figurinha
  | { type: "confirm" } // usuário confirmou "É essa"
  | { type: "reject" } // usuário rejeitou "Não é essa"
  | { type: "openManual" } // abrir entrada manual de código
  | { type: "manualResolved"; sticker: ScannedSticker; mode: ScanMode } // código digitado achou figurinha
  | { type: "closeManual" }; // fechar o manual sem concluir

export const initialScanPhase: ScanPhase = { kind: "searching" };

export function scanFlowReducer(phase: ScanPhase, event: ScanFlowEvent): ScanPhase {
  switch (event.type) {
    case "resolved":
      // Só vira confirmação a partir de procurando — não atropela um card já aberto.
      return phase.kind === "searching"
        ? { kind: "confirming", sticker: event.sticker, mode: event.mode }
        : phase;
    case "manualResolved":
      return phase.kind === "manual"
        ? { kind: "confirming", sticker: event.sticker, mode: event.mode }
        : phase;
    case "openManual":
      return phase.kind === "searching" || phase.kind === "confirming"
        ? { kind: "manual" }
        : phase;
    case "confirm":
    case "reject":
      return phase.kind === "confirming" ? { kind: "searching" } : phase;
    case "closeManual":
      return phase.kind === "manual" ? { kind: "searching" } : phase;
    default:
      return phase;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- scan-flow`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/scan-flow.ts lib/scanner/scan-flow.test.ts
git commit -m "feat(scanner): redutor puro do fluxo de confirmação (scan-flow)"
```

---

## Task 2: card de confirmação (presentational)

**Files:**
- Create: `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx`

Sem teste de DOM (o repo não tem testing-library; vitest roda em `node`). O card é puramente dirigido por props; é verificado por `tsc`/`eslint` e manualmente. Toda a lógica testável está no redutor (Task 1) e em `resolveScanAction` (já testado).

- [ ] **Step 1: Implementar o componente**

```tsx
// app/(authenticated)/collection/scanner/scanner-confirm-card.tsx
"use client";

import { Check, X, Search, Loader2 } from "lucide-react";
import type { ScannedSticker } from "@/lib/scanner/lookup-sticker-by-code";
import type { ScanActionResult } from "@/lib/scanner/resolve-scan-action";

interface Props {
  sticker: ScannedSticker;
  result: ScanActionResult;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onManual?: () => void;
}

const BORDER: Record<ScanActionResult["color"], string> = {
  green: "border-green-400",
  yellow: "border-yellow-400",
  red: "border-red-500",
};

const DOT: Record<ScanActionResult["color"], string> = {
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

export function ScannerConfirmCard({ sticker, result, busy, onConfirm, onReject, onManual }: Props) {
  return (
    <div className={`rounded-xl border-2 bg-zinc-900/95 p-4 shadow-2xl ${BORDER[result.color]}`}>
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
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
            <span className={`inline-block h-2 w-2 rounded-full ${DOT[result.color]}`} />
            {result.message}
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">É essa a figurinha que você tem?</p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          É essa
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" /> Não é essa
        </button>
      </div>
      {onManual && (
        <button
          type="button"
          onClick={onManual}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-300 disabled:opacity-50 transition-colors"
        >
          <Search className="h-3.5 w-3.5" /> Digitar código manualmente
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build/lint**

Run: `npx eslint "app/(authenticated)/collection/scanner/scanner-confirm-card.tsx" && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-confirm-card.tsx"
git commit -m "feat(scanner): recria card de confirmação (presentational)"
```

---

## Task 3: fluxo de confirmação no scanner-view (substitui execução imediata)

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

Substitui a execução imediata por: leitura → `confirming` → (no "É essa") executa a ação. Pausa o loop enquanto confirma. A entrada manual entra na Task 4 (aqui o card vai **sem** o botão "Digitar código").

- [ ] **Step 1: Imports — adicionar `useReducer`, o redutor e o card**

Trocar a primeira linha de import do React e adicionar dois imports:

```ts
import { useState, useEffect, useRef, useCallback, useReducer } from "react";
```

E, junto aos imports de `@/lib/scanner` e do diretório:

```ts
import { scanFlowReducer, initialScanPhase } from "@/lib/scanner/scan-flow";
import { ScannerConfirmCard } from "./scanner-confirm-card";
```

- [ ] **Step 2: Estado do fluxo + ref espelho + busy da confirmação**

Logo após o `const [scanMode, setScanMode] = useState<ScanMode>("lancamento");`:

```ts
  const [phase, dispatch] = useReducer(scanFlowReducer, initialScanPhase);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const phaseRef = useRef(phase);
```

E um efeito que espelha o phase num ref (pro loop ler sem se re-inscrever). Adicionar perto dos outros efeitos:

```ts
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
```

- [ ] **Step 3: Extrair a mutação em `executeScanAction` (sem undo)**

Substituir TODA a função `runScan` (atual, com toasts de "Desfazer") por esta `executeScanAction`. Ela executa a ação e mostra só o flash de sucesso — a confirmação prévia já é a salvaguarda, então o toast "Desfazer" sai:

```ts
  const executeScanAction = useCallback(
    async (sticker: ScannedSticker, activeMode: ScanMode) => {
      const { color, action, message } = resolveScanAction(activeMode, sticker.owned_count);
      const supabase = createClient();

      if (action === "add") {
        const { data } = await supabase
          .from("user_stickers")
          .insert({ user_id: userId, sticker_id: sticker.id })
          .select("id")
          .single();
        if (data?.id !== undefined) setSessionCount((n) => n + 1);
      } else if (action === "remove") {
        const { data: rows } = await supabase
          .from("user_stickers")
          .select("id")
          .eq("user_id", userId)
          .eq("sticker_id", sticker.id)
          .limit(1);
        const rowId = rows?.[0]?.id as number | undefined;
        if (rowId !== undefined) {
          await supabase.from("user_stickers").delete().eq("id", rowId);
          setSessionCount((n) => n + 1);
        }
      }
      // action === "none": nada a mutar.
      showFlash(color, `${sticker.code} — ${message}`);
    },
    [userId, showFlash],
  );
```

- [ ] **Step 4: `resolveAndRun` passa a despachar `resolved` em vez de executar**

Substituir a chamada final de `resolveAndRun`. Trocar:

```ts
      await runScan(sticker, activeMode);
```

por:

```ts
      dispatch({ type: "resolved", sticker, mode: activeMode });
```

(O resto de `resolveAndRun` — recognizeFrame, findCodeInText, flashes de erro — fica igual. `dispatch` é estável, não precisa entrar nas deps do `useCallback`.)

- [ ] **Step 5: Pausar o loop enquanto não está procurando**

No `setInterval` do efeito do loop, trocar a guarda de entrada:

```ts
      if (!video || video.readyState < 2 || readingRef.current) return;
```

por:

```ts
      if (!video || video.readyState < 2 || readingRef.current) return;
      if (phaseRef.current.kind !== "searching") return;
```

- [ ] **Step 6: Handlers de confirmar/rejeitar**

Adicionar após `executeScanAction`:

```ts
  const handleConfirm = useCallback(async () => {
    if (phaseRef.current.kind !== "confirming") return;
    const { sticker, mode: activeMode } = phaseRef.current;
    setConfirmBusy(true);
    await executeScanAction(sticker, activeMode);
    setConfirmBusy(false);
    dispatch({ type: "confirm" });
  }, [executeScanAction]);
```

- [ ] **Step 7: Renderizar o card quando `phase.kind === "confirming"`**

Antes do `{mode === null && (...)}`, adicionar:

```tsx
      {phase.kind === "confirming" && (
        <ScannerConfirmCard
          sticker={phase.sticker}
          result={resolveScanAction(phase.mode, phase.sticker.owned_count)}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onReject={() => dispatch({ type: "reject" })}
        />
      )}
```

- [ ] **Step 8: Ajustar a faixa de status do live pra refletir a confirmação**

Na faixa de status do bloco live, trocar:

```tsx
            {!codesReady ? "Carregando…" : flash ? flash.text : "Procurando figurinha…"}
```

por:

```tsx
            {!codesReady
              ? "Carregando…"
              : phase.kind !== "searching"
                ? "Confirme a figurinha"
                : flash
                  ? flash.text
                  : "Procurando figurinha…"}
```

- [ ] **Step 9: Verificar build/lint/testes**

Run: `npx eslint "app/(authenticated)/collection/scanner/scanner-view.tsx" && npx tsc --noEmit && npm test`
Expected: sem erros; 51+ testes passam. (Se o lint acusar `runScan` órfã, é porque a substituição do Step 3 não removeu tudo — confirme que `runScan` não existe mais.)

- [ ] **Step 10: Verificação manual (live + foto)**

Run: `npm run dev`. Enquadrar uma figurinha → em vez de lançar direto, aparece o **card** com imagem/código/nome. "É essa" → executa + flash de sucesso, volta a procurar. "Não é essa" → volta a procurar sem mutar. Trocar de modo e repetir; conferir que o loop **não** dispara novas leituras enquanto o card está aberto. No modo foto, tirar foto → mesmo card.

- [ ] **Step 11: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): confirmação por figurinha antes de executar a ação"
```

---

## Task 4: entrada manual de código

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

Adiciona o input manual (fallback quando o OCR erra), acessível pelo card de confirmação e por um botão sempre visível.

- [ ] **Step 1: Estado do manual**

Após o `const [confirmBusy, setConfirmBusy] = useState(false);`:

```ts
  const [manualCode, setManualCode] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
```

- [ ] **Step 2: Handlers do manual**

Adicionar após `handleConfirm`:

```ts
  const closeManual = useCallback(() => {
    setManualCode("");
    setManualError(null);
    dispatch({ type: "closeManual" });
  }, []);

  const handleManualSubmit = useCallback(async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setManualBusy(true);
    const sticker = await lookupStickerByCode(createClient(), code, userId);
    setManualBusy(false);
    if (!sticker) {
      setManualError("Código não encontrado");
      return;
    }
    setManualCode("");
    setManualError(null);
    dispatch({ type: "manualResolved", sticker, mode: scanModeRef.current });
  }, [manualCode, userId]);
```

- [ ] **Step 3: Ligar o "Digitar código" no card**

No JSX do `ScannerConfirmCard` (Task 3, Step 7), adicionar a prop `onManual`:

```tsx
          onReject={() => dispatch({ type: "reject" })}
          onManual={() => dispatch({ type: "openManual" })}
```

- [ ] **Step 4: Renderizar o bloco do manual quando `phase.kind === "manual"`**

Logo após o bloco `{phase.kind === "confirming" && (...)}`:

```tsx
      {phase.kind === "manual" && (
        <div className="rounded-xl border border-white/15 bg-zinc-900/95 p-4">
          <p className="mb-2 text-sm font-medium text-white">Digitar código</p>
          <input
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setManualError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleManualSubmit();
            }}
            autoFocus
            placeholder="ex.: MEX1"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white uppercase placeholder:text-gray-500 placeholder:normal-case"
          />
          {manualError && <p className="mt-1 text-xs text-red-400">{manualError}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleManualSubmit()}
              disabled={manualBusy || !manualCode.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-zinc-900 hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              {manualBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Buscar
            </button>
            <button
              type="button"
              onClick={closeManual}
              disabled={manualBusy}
              className="rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Botão "Digitar código" sempre acessível enquanto procura**

Pra cobrir o caso "não consegui ler" (a leitura falhou e nada virou card), adicionar um botão logo abaixo do `<p>` de instrução, visível só quando está procurando:

```tsx
      {phase.kind === "searching" && codesReady && (
        <button
          type="button"
          onClick={() => dispatch({ type: "openManual" })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300"
        >
          <Search className="h-3.5 w-3.5" /> Não leu? Digitar código
        </button>
      )}
```

E adicionar `Search` ao import de `lucide-react`:

```ts
import { Loader2, Camera, ArrowLeft, Search } from "lucide-react";
```

- [ ] **Step 6: Verificar build/lint/testes**

Run: `npx eslint "app/(authenticated)/collection/scanner/scanner-view.tsx" && npx tsc --noEmit && npm test`
Expected: sem erros; testes passam.

- [ ] **Step 7: Verificação manual**

Run: `npm run dev`. No card de confirmação, "Digitar código manualmente" → abre o input; digitar um código válido → mostra o card com a figurinha certa; "É essa" → executa. Código inválido → erro inline. "Cancelar" volta a procurar. Com o scanner procurando, o botão "Não leu? Digitar código" abre o mesmo input. Confirmar que o loop fica pausado enquanto o input está aberto.

- [ ] **Step 8: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): entrada manual de código como fallback de leitura"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Confirmação em todos os modos (live + foto), antes da ação → Task 3 (resolveAndRun despacha `resolved`; execução só no confirm). ✓
- Card mostra imagem + código + nome + cor + descrição da ação → Task 2 (usa `ScanActionResult`). ✓
- "É essa" executa / "Não é essa" descarta e rearma → Task 3 (handleConfirm; reject → searching; rearm via `lastReadSampleRef` inalterado). ✓
- Toast "Desfazer" removido → Task 3 Step 3 (`executeScanAction` sem toast). ✓
- Loop pausado durante confirmação/manual → Task 3 Step 5 (`phaseRef.current.kind !== "searching"`). ✓
- Entrada manual: lookup por código, achou → card; não achou → erro inline → Task 4. ✓
- Manual acessível do card e do estado de leitura falha → Task 4 Steps 3 e 5. ✓
- Modo capturado no disparo honrado na confirmação → o `mode` viaja no evento `resolved`/`manualResolved` e no `phase.confirming`. ✓
- Máquina de estados testável isolada → Task 1 (redutor puro + testes). ✓

**Placeholder scan:** sem TBD/TODO; todo passo de código tem código completo.

**Type consistency:** `ScanPhase`/`ScanFlowEvent`/`scanFlowReducer`/`initialScanPhase` consistentes entre Task 1, 3 e 4. `ScanActionResult` (de `resolveScanAction`) usado no card (Task 2) e ao montar a prop `result` (Task 3 Step 7). `ScannedSticker` em todos. `executeScanAction(sticker, activeMode)` definida na Task 3 e chamada por `handleConfirm`. `dispatch` eventos batem com os tipos do redutor.

**Nota:** Tasks 3 e 4 são sequenciais sobre o mesmo arquivo; cada uma compila e roda sozinha (Task 3 renderiza o card sem `onManual`; Task 4 acrescenta o manual e o botão). Implementar em ordem.
