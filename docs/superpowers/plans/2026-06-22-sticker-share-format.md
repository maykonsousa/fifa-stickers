# Novo Formato de Compartilhamento de Figurinhas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o novo formato compacto de compartilhamento: `CODE EMOJI: números×N`

**Architecture:** Função `formatShareList()` em `lib/format-sticker-list.ts` é reescrita para gerar formato de uma linha por seleção, sem header detalhado.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Duplicadas: count=2 → só número; count=3+ → `número×(count-1)`
- Faltantes: sempre só número (count=0)
- Grupos ordenados alfabeticamente por código
- Números em ordem crescente dentro de cada grupo

---

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `lib/format-sticker-list.ts` | Lógica de formatação |
| `lib/format-sticker-list.test.ts` | Testes |

---

### Task 1: Reescrever função `formatShareList()`

**Files:**
- Modify: `lib/format-sticker-list.ts:1-63`

**Interfaces:**
- Consumes: `FormatShareListInput` (mantém interface existente)
- Produces: `formatShareList(input: FormatShareListInput): string`

- [ ] **Step 1: Substituir função `formatShareList()` completa**

Substituir toda a função `formatShareList()` (linhas 34-63) pelo novo código:

```typescript
export function formatShareList(input: FormatShareListInput): string {
  const lines: string[] = [];

  for (const group of input.groups) {
    if (group.stickers.length === 0) continue;
    const emoji = getGroupEmoji(group.code);
    const stickerNumbers = group.stickers
      .map((sticker) => {
        const num = String(sticker.number);
        if (input.kind === "duplicates" && sticker.count >= 3) {
          return `${num}×${sticker.count - 1}`;
        }
        return num;
      })
      .join(", ");
    lines.push(`${group.code} ${emoji}: ${stickerNumbers}`);
  }

  if (lines.length === 0) {
    const emptyMessage = input.kind === "duplicates" ? "Nenhuma repetida" : "Nenhuma faltante";
    lines.push(emptyMessage);
  }

  lines.push("");
  lines.push("Falta alguma? Me mande sua lista! 🔄");
  lines.push(input.profileUrl);

  return lines.join("\n");
}
```

- [ ] **Step 2: Remover constantes não usadas**

Remover as linhas 27-32 do arquivo (SEPARATOR, HEADER_LABEL):

```typescript
// REMOVER ESTAS LINHAS:
// const SEPARATOR = "─────────────";
// const HEADER_LABEL: Record<ShareKind, string> = {
//   missing: "📋 Faltam",
//   duplicates: "📦 Repetidas",
// };
```

- [ ] **Step 3: Rodar testes para verificar**

Run: `npm test -- lib/format-sticker-list.test.ts`
Expected: Alguns testes falham (vamos corrigir no próximo task)

- [ ] **Step 4: Commit**

```bash
git add lib/format-sticker-list.ts
git commit -m "refactor: novo formato de compartilhamento (CODE EMOJI: nums×N)
- Uma linha por seleção
- Duplicadas mostram ×N
- Sem header detalhado"
```

---

### Task 2: Adaptar testes para novo formato

**Files:**
- Modify: `lib/format-sticker-list.test.ts:1-112`

- [ ] **Step 1: Reescrever testes completamente**

Substituir todo o conteúdo de `lib/format-sticker-list.test.ts` pelo novo:

```typescript
// lib/format-sticker-list.test.ts
import { describe, it, expect } from "vitest";
import { formatShareList, type FormatShareListInput } from "./format-sticker-list";

const baseInput: FormatShareListInput = {
  kind: "duplicates",
  displayName: "Maria",
  username: "maria",
  totalCount: 2,
  groups: [
    {
      name: "México",
      code: "MEX",
      stickers: [
        { code: "MEX1", number: 1, title: null, count: 3 },
        { code: "MEX2", number: 2, title: null, count: 2 },
      ],
    },
  ],
  profileUrl: "https://faltauma.com/p/maria",
};

describe("formatShareList — duplicates", () => {
  it("formata duplicada com count=3 como número×2", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 3 }],
        },
      ],
    });
    expect(text).toContain("MEX 🇲🇽: 1×2");
  });

  it("omite sufixo quando count=2", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX2", number: 2, title: null, count: 2 }],
        },
      ],
    });
    expect(text).toContain("MEX 🇲🇽: 2");
    expect(text).not.toContain("2×");
  });

  it("mistura stickers com e sem sufixo no mesmo grupo", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("MEX 🇲🇽: 1×2, 2");
  });

  it("suporta count alto (10)", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [{ code: "BRA7", number: 7, title: null, count: 10 }],
        },
      ],
    });
    expect(text).toContain("BRA 🇧🇷: 7×9");
  });

  it("tem formato CODE EMOJI: números", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("MEX 🇲🇽:");
    expect(text).not.toContain("*🇲🇽 México*");
    expect(text).not.toContain("(MEX)");
  });

  it("não tem header com nome ou username", () => {
    const text = formatShareList(baseInput);
    expect(text).not.toContain("María");
    expect(text).not.toContain("@maria");
    expect(text).not.toContain("🏆 *faltaUma*");
  });

  it("tem footer com mensagem e link", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("Falta alguma? Me mande sua lista! 🔄");
    expect(text).toContain("https://faltauma.com/p/maria");
  });
});

describe("formatShareList — missing", () => {
  it("mostra só número sem sufixo para faltantes", () => {
    const text = formatShareList({
      ...baseInput,
      kind: "missing",
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 0 }],
        },
      ],
    });
    expect(text).toContain("MEX 🇲🇽: 1");
    expect(text).not.toContain("1×");
  });

  it("omite sufixo mesmo com count=0", () => {
    const text = formatShareList({
      ...baseInput,
      kind: "missing",
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [{ code: "BRA5", number: 5, title: null, count: 0 }],
        },
      ],
    });
    expect(text).toContain("BRA 🇧🇷: 5");
  });
});

describe("formatShareList — edge cases", () => {
  it("trata grupo vazio (sem stickers)", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [],
        },
      ],
    });
    expect(text).not.toContain("MEX");
  });

  it("trata lista totalmente vazia", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [],
    });
    expect(text).toContain("Nenhuma repetida");
    expect(text).toContain("https://faltauma.com/p/maria");
  });

  it("ordena grupos por código (M antes de R)", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [{ code: "BRA1", number: 1, title: null, count: 2 }],
        },
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 2 }],
        },
      ],
    });
    const lines = text.split("\n");
    const firstGroupLine = lines.find((l) => l.includes("MEX") || l.includes("BRA"));
    expect(lines.indexOf(firstGroupLine!)).toBeLessThan(
      lines.indexOf(lines.find((l) => l.includes("BRA"))!)
    );
  });

  it("ordena números em ordem crescente", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [
            { code: "BRA5", number: 5, title: null, count: 2 },
            { code: "BRA1", number: 1, title: null, count: 2 },
            { code: "BRA10", number: 10, title: null, count: 2 },
          ],
        },
      ],
    });
    expect(text).toContain("BRA 🇧🇷: 1, 5, 10");
  });
});
```

- [ ] **Step 2: Rodar testes**

Run: `npm test -- lib/format-sticker-list.test.ts`
Expected: Todos os testes passam

- [ ] **Step 3: Commit**

```bash
git add lib/format-sticker-list.test.ts
git commit -m "test: adaptar testes para novo formato de compartilhamento"
```

---

## Resumo dos Changes

| Task | Arquivo | Mudança |
|------|---------|---------|
| 1 | `lib/format-sticker-list.ts` | Reescrever `formatShareList()` |
| 2 | `lib/format-sticker-list.test.ts` | Reescrever todos os testes |

**Total de tasks:** 2
