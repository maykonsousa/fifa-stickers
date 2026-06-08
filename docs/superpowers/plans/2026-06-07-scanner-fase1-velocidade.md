# Scanner Fase 1 — Menos chamadas ao Vision e leitura mais rápida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir chamadas pagas ao Google Vision e o tempo por leitura do scanner, recortando só o badge do código antes do OCR, exigindo nitidez antes de disparar, e fundindo as duas queries do Supabase numa só RPC.

**Architecture:** Três mudanças isoladas, sem alterar o "cérebro" da leitura (Vision continua sendo o OCR). (1) Uma função pura calcula o sub-retângulo do badge dentro do mira; a captura passa esse recorte menor ao Vision. (2) Uma nova métrica de nitidez (variância do Laplaciano) entra como condição extra na máquina de estados do gatilho on-device. (3) Uma RPC Postgres devolve o sticker + contagem do usuário numa linha só. O modo foto fica inalterado.

**Tech Stack:** Next.js (versão com convenções próprias — ver AGENTS.md), TypeScript, Vitest, Supabase (Postgres + PostgREST RPC).

**Spec:** `docs/superpowers/specs/2026-06-07-scanner-fase1-velocidade-design.md`

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `lib/scanner/code-crop-region.ts` | função pura: sub-retângulo do badge dentro do mira | Criar |
| `lib/scanner/code-crop-region.test.ts` | testes da função acima | Criar |
| `lib/scanner/frame-metrics.ts` | métricas puras de frame; ganha `sharpness` | Modificar |
| `lib/scanner/frame-metrics.test.ts` | testes; ganha bloco de `sharpness` | Modificar |
| `lib/scanner/frame-signal.ts` | máquina de estados do gatilho; ganha condição de nitidez | Modificar |
| `lib/scanner/frame-signal.test.ts` | testes; atualizar samples + casos de nitidez | Modificar |
| `supabase/migrations/064_lookup_sticker_by_code.sql` | RPC que devolve sticker + contagem numa linha | Criar |
| `lib/scanner/lookup-sticker-by-code.ts` | passa a chamar a RPC; mesma assinatura | Modificar |
| `lib/scanner/lookup-sticker-by-code.test.ts` | testes da RPC mockada | Criar |
| `app/(authenticated)/collection/scanner/scanner-view.tsx` | constante `CODE`, amostra de nitidez do badge, recorte na captura, limiar `sharpness` | Modificar |

**Notas de convenção (confirmadas no repo):**
- Testes: Vitest, colocados como `*.test.ts` ao lado do fonte. Import: `import { describe, it, expect } from "vitest"`.
- Rodar todos: `npm run test`. Rodar um arquivo: `npx vitest run <caminho>`.
- Migrations: `supabase/migrations/NNN_*.sql`, próximo número é **064** (última é `063`). Padrão de RPC: `CREATE OR REPLACE FUNCTION ... LANGUAGE sql SECURITY DEFINER SET search_path = ''`, tabelas qualificadas com `public.`, e `GRANT EXECUTE ... TO authenticated, anon;`.
- Lint: `npm run lint`. Não há script de typecheck dedicado.
- Tipos reais: `stickers.id` é `SERIAL` (int → `number` em TS), `stickers.code` é `text`, `user_stickers.user_id` é `uuid`, `user_stickers.sticker_id` é `int`.

**Antes de mexer em qualquer arquivo Next/rota:** o `AGENTS.md` exige ler o guia relevante em `node_modules/next/dist/docs/`. Nenhuma tarefa aqui cria rota nova, mas a Task 6 mexe em componente client — confira convenções se algo destoar.

---

## Task 1: Função pura `codeCropRegion`

Calcula o sub-retângulo do badge (canto superior direito) dentro do retângulo do mira que o `coverCropRegion` já devolve. Espelha o estilo de `cover-crop-region.ts` (função pura, sem DOM).

**Files:**
- Create: `lib/scanner/code-crop-region.ts`
- Test: `lib/scanner/code-crop-region.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/scanner/code-crop-region.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { codeCropRegion } from "./code-crop-region";

describe("codeCropRegion", () => {
  it("ancora no canto superior direito com as frações dadas", () => {
    // mira 800x600 começando em (100, 50); badge 50% largura x 20% altura
    const mira = { sx: 100, sy: 50, sw: 800, sh: 600 };
    expect(codeCropRegion(mira, { w: 0.5, h: 0.2 })).toEqual({
      sx: 500, // 100 + 800 * (1 - 0.5)
      sy: 50, // topo do mira
      sw: 400, // 800 * 0.5
      sh: 120, // 600 * 0.2
    });
  });

  it("largura/altura cheias (1.0) devolvem o próprio mira", () => {
    const mira = { sx: 10, sy: 20, sw: 300, sh: 200 };
    expect(codeCropRegion(mira, { w: 1, h: 1 })).toEqual({
      sx: 10,
      sy: 20,
      sw: 300,
      sh: 200,
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run lib/scanner/code-crop-region.test.ts`
Expected: FAIL — `Failed to resolve import "./code-crop-region"`.

- [ ] **Step 3: Implementar o mínimo**

Criar `lib/scanner/code-crop-region.ts`:

```typescript
// Calcula o sub-retângulo do badge do código (canto superior direito) DENTRO do
// retângulo do mira que coverCropRegion devolve. Tudo em pixels de fonte. Função
// pura, sem DOM — o recorte fino vai pra crop-frame na hora de gerar o JPEG do
// Vision. Mandar só o badge = imagem menor (round-trip mais rápido) e sem a arte
// da carta (leitura mais certeira na primeira tentativa).

import type { CropRegion } from "./crop-frame";

export function codeCropRegion(mira: CropRegion, code: { w: number; h: number }): CropRegion {
  return {
    sx: mira.sx + mira.sw * (1 - code.w),
    sy: mira.sy,
    sw: mira.sw * code.w,
    sh: mira.sh * code.h,
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run lib/scanner/code-crop-region.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/code-crop-region.ts lib/scanner/code-crop-region.test.ts
git commit -m "feat(scanner): codeCropRegion — recorte do badge do código dentro do mira"
```

---

## Task 2: Métrica de nitidez `sharpness`

Variância do Laplaciano sobre um buffer cinza. Superfície borrada → baixa; bordas de texto nítidas → alta. Função pura adicionada a `frame-metrics.ts`, ao lado de `contentScore`.

**Files:**
- Modify: `lib/scanner/frame-metrics.ts`
- Modify: `lib/scanner/frame-metrics.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `lib/scanner/frame-metrics.test.ts` (e incluir `sharpness` no import do topo do arquivo — o import atual é `import { toGray, meanAbsDiff, contentScore } from "./frame-metrics";`, passa a ser `import { toGray, meanAbsDiff, contentScore, sharpness } from "./frame-metrics";`):

```typescript
describe("sharpness", () => {
  it("buffer uniforme (sem bordas) → 0", () => {
    const flat = new Uint8Array(4 * 4).fill(128);
    expect(sharpness(flat, 4, 4)).toBe(0);
  });

  it("buffer com bordas fortes tem nitidez maior que um quase-uniforme", () => {
    const w = 4;
    const h = 4;
    // Tabuleiro de xadrez 0/255 = bordas em todo pixel interno.
    const sharp = new Uint8Array(w * h);
    for (let i = 0; i < sharp.length; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      sharp[i] = (x + y) % 2 === 0 ? 0 : 255;
    }
    const blurry = new Uint8Array(w * h).fill(120);
    expect(sharpness(sharp, w, h)).toBeGreaterThan(sharpness(blurry, w, h));
  });

  it("dimensões inválidas (sem pixels internos) → 0, sem NaN", () => {
    expect(sharpness(new Uint8Array(0), 0, 0)).toBe(0);
    expect(sharpness(new Uint8Array(2), 2, 1)).toBe(0); // h<3, nenhum pixel interno
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/scanner/frame-metrics.test.ts`
Expected: FAIL — `sharpness is not a function` / import não resolve o símbolo.

- [ ] **Step 3: Implementar o mínimo**

Adicionar ao fim de `lib/scanner/frame-metrics.ts`:

```typescript
// Nitidez = variância do Laplaciano (kernel 4-vizinhos) sobre o buffer cinza.
// Frame borrado → resposta baixa em toda parte → variância baixa; texto nítido →
// bordas fortes → variância alta. Só percorre os pixels internos (precisa dos 4
// vizinhos), então exige w>=3 e h>=3; caso contrário devolve 0. Custo O(n).
export function sharpness(gray: Uint8Array, w: number, h: number): number {
  if (w < 3 || h < 3 || gray.length < w * h) return 0;
  const lap: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap.push(v);
    }
  }
  if (lap.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < lap.length; i++) mean += lap[i];
  mean /= lap.length;
  let variance = 0;
  for (let i = 0; i < lap.length; i++) {
    const d = lap[i] - mean;
    variance += d * d;
  }
  return variance / lap.length;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/scanner/frame-metrics.test.ts`
Expected: PASS (testes antigos de `toGray`/`meanAbsDiff`/`contentScore` + os 3 novos de `sharpness`).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/frame-metrics.ts lib/scanner/frame-metrics.test.ts
git commit -m "feat(scanner): métrica sharpness (variância do Laplaciano)"
```

---

## Task 3: Condição de nitidez no gatilho (`frame-signal`)

`FrameSample` e `FrameThresholds` ganham `sharpness`; `nextFrameSignal` passa a exigir nitidez além de estabilidade e conteúdo na fase `searching`. Os testes existentes constroem `FrameSample` sem `sharpness` — precisam ser atualizados para continuar passando.

**Files:**
- Modify: `lib/scanner/frame-signal.ts`
- Modify: `lib/scanner/frame-signal.test.ts`

- [ ] **Step 1: Atualizar os testes existentes + adicionar casos de nitidez (falham primeiro)**

Substituir o conteúdo de `lib/scanner/frame-signal.test.ts` por:

```typescript
import { describe, it, expect } from "vitest";
import { nextFrameSignal, initialFrameState, type FrameThresholds } from "./frame-signal";

const T: FrameThresholds = { diff: 6, content: 100, rearmDiff: 14, stableSamples: 3, sharpness: 50 };

describe("nextFrameSignal — searching", () => {
  it("dispara após N amostras estáveis, com conteúdo e nítidas", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, sharpness: 200, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // 1ª
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 2ª
    expect(d.kind).toBe("wait");
    d = nextFrameSignal(d.state, stable, T); // 3ª → fire
    expect(d.kind).toBe("fire");
    expect(d.state.phase).toBe("rearm");
  });

  it("não dispara se estável mas sem conteúdo (mesa vazia)", () => {
    let state = initialFrameState();
    const empty = { diffFromPrev: 1, content: 10, sharpness: 200, diffFromLastRead: null };
    for (let i = 0; i < 5; i++) {
      const d = nextFrameSignal(state, empty, T);
      expect(d.kind).toBe("wait");
      state = d.state;
    }
  });

  it("não dispara se estável e com conteúdo mas borrado (nitidez baixa)", () => {
    let state = initialFrameState();
    const blurry = { diffFromPrev: 2, content: 5000, sharpness: 10, diffFromLastRead: null };
    for (let i = 0; i < 5; i++) {
      const d = nextFrameSignal(state, blurry, T);
      expect(d.kind).toBe("wait");
      expect(d.state.stableCount).toBe(0);
      state = d.state;
    }
  });

  it("zera a contagem quando o frame se mexe (instável)", () => {
    let state = initialFrameState();
    const stable = { diffFromPrev: 2, content: 5000, sharpness: 200, diffFromLastRead: null };
    const moving = { diffFromPrev: 40, content: 5000, sharpness: 200, diffFromLastRead: null };
    let d = nextFrameSignal(state, stable, T); // count 1
    d = nextFrameSignal(d.state, moving, T); // reseta
    expect(d.state.stableCount).toBe(0);
    d = nextFrameSignal(d.state, stable, T); // 1
    d = nextFrameSignal(d.state, stable, T); // 2
    d = nextFrameSignal(d.state, stable, T); // 3 → fire
    expect(d.kind).toBe("fire");
  });
});

describe("nextFrameSignal — rearm", () => {
  it("fica em rearm enquanto o frame não mudar do último lido", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const same = { diffFromPrev: 1, content: 5000, sharpness: 200, diffFromLastRead: 3 };
    const d = nextFrameSignal(state, same, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("rearm");
  });

  it("volta a searching quando o frame muda bastante (trocou a figurinha)", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const changed = { diffFromPrev: 30, content: 5000, sharpness: 200, diffFromLastRead: 50 };
    const d = nextFrameSignal(state, changed, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("searching");
    expect(d.state.stableCount).toBe(0);
  });

  it("a igualdade exata com rearmDiff já conta como mudou", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const exact = { diffFromPrev: 30, content: 5000, sharpness: 200, diffFromLastRead: T.rearmDiff };
    const d = nextFrameSignal(state, exact, T);
    expect(d.state.phase).toBe("searching");
  });

  it("sem assinatura do último lido (null) fica preso em rearm — nunca dispara às cegas", () => {
    const state = { phase: "rearm" as const, stableCount: 0 };
    const noSig = { diffFromPrev: 99, content: 5000, sharpness: 200, diffFromLastRead: null };
    const d = nextFrameSignal(state, noSig, T);
    expect(d.kind).toBe("wait");
    expect(d.state.phase).toBe("rearm");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/scanner/frame-signal.test.ts`
Expected: FAIL — erro de tipo / o caso "borrado" dispara porque `sharpness` ainda não é checado (e `FrameThresholds`/`FrameSample` não têm o campo).

- [ ] **Step 3: Implementar a mudança no gatilho**

Em `lib/scanner/frame-signal.ts`, adicionar `sharpness` aos dois tipos e a condição no `searching`.

Trocar o bloco `FrameThresholds` (atualmente termina em `stableSamples: number;`) por:

```typescript
export interface FrameThresholds {
  diff: number; // diffFromPrev <= diff → estável
  content: number; // content >= content → tem conteúdo na mira
  rearmDiff: number; // diffFromLastRead >= rearmDiff → figurinha trocou
  stableSamples: number; // nº de amostras estáveis seguidas pra disparar
  sharpness: number; // sharpness >= sharpness → badge nítido o bastante pra ler
}
```

Trocar o bloco `FrameSample` por:

```typescript
export interface FrameSample {
  diffFromPrev: number; // diff vs amostra anterior
  content: number; // contraste/variância da mira
  sharpness: number; // nitidez (variância do Laplaciano) na região do badge
  diffFromLastRead: number | null; // diff vs assinatura do último lido (null se nunca leu)
}
```

No corpo de `nextFrameSignal`, dentro do ramo `// searching`, trocar:

```typescript
  // searching
  const stable = sample.diffFromPrev <= t.diff;
  const hasContent = sample.content >= t.content;
  if (!stable || !hasContent) {
    return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
  }
```

por:

```typescript
  // searching
  const stable = sample.diffFromPrev <= t.diff;
  const hasContent = sample.content >= t.content;
  const sharp = sample.sharpness >= t.sharpness;
  if (!stable || !hasContent || !sharp) {
    return { kind: "wait", state: { phase: "searching", stableCount: 0 } };
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/scanner/frame-signal.test.ts`
Expected: PASS (todos, incluindo o caso "borrado").

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/frame-signal.ts lib/scanner/frame-signal.test.ts
git commit -m "feat(scanner): gatilho exige nitidez (sharpness) antes de chamar o Vision"
```

---

## Task 4: Migration — RPC `lookup_sticker_by_code`

Função Postgres que devolve o sticker por código já com a contagem de cópias do usuário, numa linha só. Segue o padrão do `062`.

**Files:**
- Create: `supabase/migrations/064_lookup_sticker_by_code.sql`

- [ ] **Step 1: Criar a migration**

Criar `supabase/migrations/064_lookup_sticker_by_code.sql`:

```sql
-- 064_lookup_sticker_by_code.sql
-- Funde as duas queries do scanner (busca o sticker por código + conta as cópias
-- do usuário) numa RPC única, tirando um round-trip do caminho crítico pós-Vision.
-- Usada por lib/scanner/lookup-sticker-by-code.ts.

CREATE OR REPLACE FUNCTION lookup_sticker_by_code(p_code TEXT, p_user_id UUID)
RETURNS TABLE (
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  owned_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    (
      SELECT COUNT(*)::INT
      FROM public.user_stickers us
      WHERE us.sticker_id = s.id AND us.user_id = p_user_id
    ) AS owned_count
  FROM public.stickers s
  WHERE s.code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_sticker_by_code(TEXT, UUID) TO authenticated, anon;
```

- [ ] **Step 2: Aplicar a migration localmente**

Run: `npx supabase db push` (ou o comando de migração usado no projeto; confirmar com `npx supabase --help` se necessário).
Expected: aplica `064_lookup_sticker_by_code.sql` sem erro.

> Se o ambiente local de Supabase não estiver disponível nesta sessão, registrar isso explicitamente e seguir — a Task 5 testa o client com a RPC mockada, e a validação real fica para a verificação manual (Task 7).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/064_lookup_sticker_by_code.sql
git commit -m "feat(db): RPC lookup_sticker_by_code — sticker + contagem numa query"
```

---

## Task 5: `lookupStickerByCode` passa a usar a RPC

Mesma assinatura e mesmo retorno (`ScannedSticker | null`); por dentro chama a RPC (que devolve um array de 0 ou 1 linha).

**Files:**
- Modify: `lib/scanner/lookup-sticker-by-code.ts`
- Test: `lib/scanner/lookup-sticker-by-code.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/scanner/lookup-sticker-by-code.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupStickerByCode } from "./lookup-sticker-by-code";

function fakeClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const client = { rpc } as unknown as SupabaseClient;
  return { client, rpc };
}

describe("lookupStickerByCode", () => {
  it("chama a RPC lookup_sticker_by_code com código e usuário", async () => {
    const { client, rpc } = fakeClient({
      data: [{ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2 }],
      error: null,
    });
    await lookupStickerByCode(client, "MEX1", "user-123");
    expect(rpc).toHaveBeenCalledWith("lookup_sticker_by_code", {
      p_code: "MEX1",
      p_user_id: "user-123",
    });
  });

  it("devolve o sticker mapeado quando a RPC retorna uma linha", async () => {
    const { client } = fakeClient({
      data: [{ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2 }],
      error: null,
    });
    const result = await lookupStickerByCode(client, "MEX1", "user-123");
    expect(result).toEqual({ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2 });
  });

  it("devolve null quando a RPC não retorna linha (código inexistente)", async () => {
    const { client } = fakeClient({ data: [], error: null });
    const result = await lookupStickerByCode(client, "ZZZ9", "user-123");
    expect(result).toBeNull();
  });

  it("devolve null quando a RPC erra", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    const result = await lookupStickerByCode(client, "MEX1", "user-123");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/scanner/lookup-sticker-by-code.test.ts`
Expected: FAIL — a implementação atual chama `.from(...)`, não `.rpc(...)`, então `rpc` não é chamado e as asserções falham (ou `client.from` não existe no fake).

- [ ] **Step 3: Reescrever a implementação para usar a RPC**

Substituir o conteúdo de `lib/scanner/lookup-sticker-by-code.ts` por:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScannedSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

// Resolve uma figurinha pelo código já com a contagem de cópias do usuário, via a
// RPC lookup_sticker_by_code (uma query só — ver migration 064). A RPC retorna uma
// tabela de 0 ou 1 linha; pegamos a primeira.
export async function lookupStickerByCode(
  supabase: SupabaseClient,
  code: string,
  userId: string,
): Promise<ScannedSticker | null> {
  const { data, error } = await supabase.rpc("lookup_sticker_by_code", {
    p_code: code,
    p_user_id: userId,
  });

  if (error) return null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    image_url: row.image_url,
    owned_count: row.owned_count ?? 0,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/scanner/lookup-sticker-by-code.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/scanner/lookup-sticker-by-code.ts lib/scanner/lookup-sticker-by-code.test.ts
git commit -m "refactor(scanner): lookupStickerByCode usa a RPC (uma query só)"
```

---

## Task 6: Ligar tudo no `scanner-view.tsx`

Adiciona a constante `CODE`, mede nitidez na região do badge a cada amostra, e recorta o badge antes de mandar pro Vision (só no modo live). Modo foto fica inalterado.

**Files:**
- Modify: `app/(authenticated)/collection/scanner/scanner-view.tsx`

- [ ] **Step 1: Importar as novas funções**

No topo do arquivo, junto aos imports de `lib/scanner`:
- A linha `import { toGray, meanAbsDiff, contentScore } from "@/lib/scanner/frame-metrics";` passa a:

```typescript
import { toGray, meanAbsDiff, contentScore, sharpness } from "@/lib/scanner/frame-metrics";
```

- Adicionar logo abaixo do import de `cover-crop-region` (`import { coverCropRegion } from "@/lib/scanner/cover-crop-region";`):

```typescript
import { codeCropRegion } from "@/lib/scanner/code-crop-region";
```

- [ ] **Step 2: Adicionar a constante `CODE` e o tamanho da amostra do badge, e o limiar de nitidez**

Logo após a definição de `MIRA` (`const MIRA = { w: 0.82, h: 0.62 };`), adicionar:

```typescript
// Região do código DENTRO do mira: badge no canto superior direito. Folga
// generosa pra não cortar o badge se o enquadramento variar; calibrar em
// dispositivo. Só o modo live usa este recorte.
const CODE = { w: 0.45, h: 0.25 };

// Amostra pequena só do badge, pra medir nitidez (sharpness) sem custo.
const BADGE_SAMPLE = { w: 64, h: 32 };
```

No objeto `THRESHOLDS` (`const THRESHOLDS: FrameThresholds = { diff: 6, content: 400, rearmDiff: 14, stableSamples: 3 };`), acrescentar o campo `sharpness` (valor inicial conservador — baixo — pra calibrar pra cima depois):

```typescript
const THRESHOLDS: FrameThresholds = {
  diff: 6,
  content: 400,
  rearmDiff: 14,
  stableSamples: 3,
  sharpness: 40,
};
```

- [ ] **Step 3: Adicionar o ref do canvas de amostra do badge**

Junto aos refs de amostra (logo após `const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);`), adicionar:

```typescript
  const badgeSampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
```

- [ ] **Step 4: Medir nitidez no loop de amostragem**

No efeito do `setInterval` (loop de ~170ms), depois do bloco que calcula `gray` da mira e antes de montar `decision`, inserir a amostra de nitidez do badge. Localizar este trecho:

```typescript
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
```

e substituir por:

```typescript
      const gray = toGray(ctx.getImageData(0, 0, SAMPLE.w, SAMPLE.h).data);

      // Amostra só do badge pra medir nitidez (a mira inteira teria o badge num
      // cantinho pequeno demais pro Laplaciano ser confiável).
      const badgeCanvas = badgeSampleCanvasRef.current ?? document.createElement("canvas");
      badgeSampleCanvasRef.current = badgeCanvas;
      badgeCanvas.width = BADGE_SAMPLE.w;
      badgeCanvas.height = BADGE_SAMPLE.h;
      const badgeCtx = badgeCanvas.getContext("2d", { willReadFrequently: true });
      let badgeSharpness = 0;
      if (badgeCtx) {
        const badge = codeCropRegion(region, CODE);
        badgeCtx.drawImage(
          video,
          badge.sx,
          badge.sy,
          badge.sw,
          badge.sh,
          0,
          0,
          BADGE_SAMPLE.w,
          BADGE_SAMPLE.h,
        );
        const badgeGray = toGray(
          badgeCtx.getImageData(0, 0, BADGE_SAMPLE.w, BADGE_SAMPLE.h).data,
        );
        badgeSharpness = sharpness(badgeGray, BADGE_SAMPLE.w, BADGE_SAMPLE.h);
      }

      const prev = prevSampleRef.current;
      const lastRead = lastReadSampleRef.current;
      const decision = nextFrameSignal(
        signalStateRef.current,
        {
          diffFromPrev: prev ? meanAbsDiff(gray, prev) : Infinity,
          content: contentScore(gray),
          sharpness: badgeSharpness,
          diffFromLastRead: lastRead ? meanAbsDiff(gray, lastRead) : null,
        },
        THRESHOLDS,
      );
```

- [ ] **Step 5: Recortar o badge na captura (`autoCapture`)**

Localizar em `autoCapture`:

```typescript
      const region = coverCropRegion(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
        MIRA.w,
        MIRA.h,
      );
      const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, region);
```

e substituir por:

```typescript
      const region = coverCropRegion(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
        MIRA.w,
        MIRA.h,
      );
      const badge = codeCropRegion(region, CODE);
      const image = cropToJpegBase64(video, video.videoWidth, video.videoHeight, badge);
```

(O modo foto em `handlePhoto` continua chamando `cropToJpegBase64(img, ...)` sem região — **não alterar**.)

- [ ] **Step 6: Verificar lint e build**

Run: `npm run lint`
Expected: sem erros novos no arquivo.

Run: `npm run test`
Expected: toda a suíte passa (Tasks 1–5 incluídas).

- [ ] **Step 7: Commit**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "feat(scanner): recorta só o badge pro Vision + gate de nitidez no modo live"
```

---

## Task 7: Verificação manual e calibração em dispositivo

Não há teste automatizado para câmera real; esta etapa valida e calibra. Sem código — checklist de verificação.

**Files:** nenhum (ajustes de constantes em `scanner-view.tsx` se necessário)

- [ ] **Step 1: Subir o app e abrir o scanner num celular** (modo live, câmera traseira).

- [ ] **Step 2: Confirmar leitura nas duas variantes de cor do badge** (preto-com-claro e o inverso). Cada uma deve resolver a figurinha. Se uma falha consistentemente, o recorte `CODE` provavelmente está cortando o badge — aumentar `CODE.w`/`CODE.h`.

- [ ] **Step 3: Calibrar `THRESHOLDS.sharpness`.** Tremer/desfocar de propósito não deve disparar; com a carta parada e nítida deve disparar rápido. Subir o valor se dispara borrado; baixar se não dispara com carta boa.

- [ ] **Step 4: Calibrar `CODE`** (frações do recorte) até o badge ficar bem enquadrado no JPEG enviado, com folga.

- [ ] **Step 5: Medir tempo por leitura antes/depois** (sensação em "momento de troca") e confirmar que a RPC única não regrediu a resolução do código (figurinha existente resolve; inexistente cai no "Código não encontrado").

- [ ] **Step 6: Commit dos ajustes de calibração (se houver)**

```bash
git add "app/(authenticated)/collection/scanner/scanner-view.tsx"
git commit -m "chore(scanner): calibra CODE e sharpness em dispositivo"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** Bloco 1 → Tasks 1 e 6 (Steps 5). Bloco 2 → Tasks 2, 3 e 6 (Steps 2–4). Bloco 3 → Tasks 4 e 5. Modo foto inalterado → explícito na Task 6 Step 5. Calibração/risco → Task 7.
- **Sem placeholders:** todo step com código mostra o código completo; comandos com saída esperada.
- **Consistência de tipos:** `CropRegion` (de `crop-frame.ts`) reusado em `codeCropRegion`; `FrameSample`/`FrameThresholds` ganham `sharpness` e todos os call sites (testes + `scanner-view`) passam o campo; `ScannedSticker` mantém forma idêntica; RPC `lookup_sticker_by_code` com os mesmos nomes de parâmetro (`p_code`, `p_user_id`) no SQL e no client.
