# Scanner: helper por modo + rótulos dinâmicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a UI do scanner autoexplicativa: texto de instrução por modo + botões do card de confirmação com rótulos dinâmicos (Lançar/Pegar/Entregar/Próxima) e "Cancelar".

**Architecture:** O verbo da ação vira mais um campo (`actionLabel`) em `resolveScanAction` (fonte única da verdade, derivado de modo+ação). O card mostra esse rótulo; o `scanner-view` renderiza um texto-helper por modo a partir de uma constante.

**Tech Stack:** Next 16 client component, vitest (node env), Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-06-scanner-helper-e-rotulos-design.md`

---

## Task 1: `actionLabel` em `resolveScanAction`

**Files:**
- Modify: `lib/scanner/resolve-scan-action.ts`
- Test: `lib/scanner/resolve-scan-action.test.ts`

- [ ] **Step 1: Atualizar o teste (adicionar `actionLabel` a cada caso) — deve falhar**

Substituir o conteúdo de `lib/scanner/resolve-scan-action.test.ts` por:

```ts
import { describe, it, expect } from "vitest";
import { resolveScanAction } from "./resolve-scan-action";

describe("resolveScanAction", () => {
  it("lançamento: nova → verde, add, rótulo nova, Lançar", () => {
    expect(resolveScanAction("lancamento", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova lançada",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: repetida → verde, add, rótulo repetida, Lançar", () => {
    expect(resolveScanAction("lancamento", 3)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
      actionLabel: "Lançar",
    });
  });

  it("lançamento: fronteira ownedCount===1 → repetida, Lançar", () => {
    expect(resolveScanAction("lancamento", 1)).toEqual({
      color: "green",
      action: "add",
      message: "Repetida lançada",
      actionLabel: "Lançar",
    });
  });

  it("troca: não tem → verde, add, Pegar", () => {
    expect(resolveScanAction("troca", 0)).toEqual({
      color: "green",
      action: "add",
      message: "Nova — pega!",
      actionLabel: "Pegar",
    });
  });

  it("troca: já tem → vermelho, none, Próxima", () => {
    expect(resolveScanAction("troca", 1)).toEqual({
      color: "red",
      action: "none",
      message: "Você já tem — pula",
      actionLabel: "Próxima",
    });
  });

  it("baixa: tem repetida (>=2) → verde, remove, Entregar", () => {
    expect(resolveScanAction("baixa", 2)).toEqual({
      color: "green",
      action: "remove",
      message: "Baixa dada",
      actionLabel: "Entregar",
    });
  });

  it("baixa: só a única (==1) → amarelo, none, Próxima", () => {
    expect(resolveScanAction("baixa", 1)).toEqual({
      color: "yellow",
      action: "none",
      message: "Essa é sua única",
      actionLabel: "Próxima",
    });
  });

  it("baixa: não tem (==0) → vermelho, none, Próxima", () => {
    expect(resolveScanAction("baixa", 0)).toEqual({
      color: "red",
      action: "none",
      message: "Você não tem essa",
      actionLabel: "Próxima",
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- resolve-scan-action`
Expected: FAIL — objetos retornados não têm `actionLabel`.

- [ ] **Step 3: Implementar.** Substituir o arquivo `lib/scanner/resolve-scan-action.ts` por:

```ts
// Decide, a partir do modo do scanner e de quantas cópias o usuário já tem,
// a cor do sinal, a ação (mutação), a mensagem e o rótulo do botão de confirmar.
// Função pura — toda a regra de negócio dos modos vive aqui; o scanner-view só
// executa o resultado e o card só exibe.

export type ScanMode = "lancamento" | "troca" | "baixa";
export type ScanColor = "green" | "yellow" | "red";
export type ScanActionKind = "add" | "remove" | "none";

export interface ScanActionResult {
  color: ScanColor;
  action: ScanActionKind;
  message: string;
  // Rótulo do botão de confirmar: o verbo da ação ("Lançar"/"Pegar"/"Entregar")
  // quando há mutação; "Próxima" quando é só conferir a leitura (action "none").
  actionLabel: string;
}

// Mínimo de cópias pra dar baixa: precisa sobrar pelo menos 1 (não baixamos a única).
const MIN_OWNED_TO_REMOVE = 2;

export function resolveScanAction(mode: ScanMode, ownedCount: number): ScanActionResult {
  if (mode === "lancamento") {
    return {
      color: "green",
      action: "add",
      message: ownedCount > 0 ? "Repetida lançada" : "Nova lançada",
      actionLabel: "Lançar",
    };
  }

  if (mode === "troca") {
    return ownedCount === 0
      ? { color: "green", action: "add", message: "Nova — pega!", actionLabel: "Pegar" }
      : { color: "red", action: "none", message: "Você já tem — pula", actionLabel: "Próxima" };
  }

  if (mode === "baixa") {
    if (ownedCount >= MIN_OWNED_TO_REMOVE)
      return { color: "green", action: "remove", message: "Baixa dada", actionLabel: "Entregar" };
    if (ownedCount === 1)
      return { color: "yellow", action: "none", message: "Essa é sua única", actionLabel: "Próxima" };
    return { color: "red", action: "none", message: "Você não tem essa", actionLabel: "Próxima" };
  }

  // Exaustividade: se um modo novo entrar em ScanMode, o TS acusa aqui.
  const _exhaustive: never = mode;
  throw new Error(`modo de scan desconhecido: ${_exhaustive}`);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- resolve-scan-action`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/resolve-scan-action.ts lib/scanner/resolve-scan-action.test.ts
git commit -m "feat(scanner): actionLabel (Lançar/Pegar/Entregar/Próxima) no resolveScanAction"
```

---

## Task 2: rótulos no card + helper por modo no scanner-view

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx`
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

- [ ] **Step 1: Botão de confirmar usa `result.actionLabel`.** Em `scanner-confirm-card.tsx`, no botão de confirmar, trocar o texto fixo "É essa":

```tsx
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          É essa
```

por:

```tsx
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {result.actionLabel}
```

- [ ] **Step 2: Botão de rejeitar vira "Cancelar".** No mesmo arquivo, trocar:

```tsx
          <X className="h-4 w-4" /> Não é essa
```

por:

```tsx
          <X className="h-4 w-4" /> Cancelar
```

- [ ] **Step 3: Constante do helper por modo.** Em `scanner-view.tsx`, abaixo da constante `SCAN_MODES`, adicionar:

```ts
// Texto-helper que explica o que cada modo faz (mostrado abaixo do seletor).
const SCAN_MODE_HELP: Record<ScanMode, string> = {
  lancamento: "Use para adicionar novas figurinhas ao seu álbum — incluindo as repetidas.",
  troca: "Use para analisar as figurinhas de outro colecionador e pegar as que faltam.",
  baixa: "Use para remover do álbum as repetidas que você está trocando.",
};
```

- [ ] **Step 4: Renderizar o helper por modo.** Em `scanner-view.tsx`, trocar a `<p>` de instrução:

```tsx
      <p className="text-sm text-gray-400">
        Enquadre a figurinha inteira na caixa — o código é detectado automaticamente.
      </p>
```

por:

```tsx
      <p className="text-sm text-gray-400">{SCAN_MODE_HELP[scanMode]}</p>
```

- [ ] **Step 5: Verificar build/lint/testes**

Run: `npx eslint "app/(authenticated)/collection/scanner/scanner-confirm-card.tsx" "app/(authenticated)/collection/scanner/scanner-view.tsx" && npx tsc --noEmit && npm test`
Expected: sem erros; todos os testes passam.

- [ ] **Step 6: Verificação manual**

Run: `npm run dev`. Trocar entre os três modos → o texto-helper muda. Escanear → o card mostra o verbo certo no botão (Lançar / Pegar / Entregar; "Próxima" numa repetida em Troca ou na única em Baixa) e "Cancelar" no outro botão.

- [ ] **Step 7: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-confirm-card.tsx" "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): helper por modo + botões Lançar/Pegar/Entregar/Próxima e Cancelar"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Helper por modo substituindo a instrução estática → Task 2 (Steps 3–4). ✓
- `actionLabel` dinâmico (Lançar/Pegar/Entregar/Próxima) como fonte única → Task 1. ✓
- Card usa `result.actionLabel` no confirmar → Task 2 Step 1. ✓
- Reject vira "Cancelar" → Task 2 Step 2. ✓
- Pergunta "É essa a figurinha que você tem?" permanece → não tocada. ✓

**Placeholder scan:** sem TBD/TODO; código completo em cada passo (test file e implementação inteiros).

**Type consistency:** `ScanActionResult` ganha `actionLabel: string` na Task 1, consumido como `result.actionLabel` na Task 2. `SCAN_MODE_HELP: Record<ScanMode, string>` usa o `ScanMode` já importado no `scanner-view`. `scanMode` (estado existente) indexa o helper.
