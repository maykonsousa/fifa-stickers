# Share Duplicates Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `×N` next to sticker codes in the shared duplicates list when the user has 3 or more copies of that sticker.

**Architecture:** Reuse the existing `get_user_share_list` RPC and the existing `formatShareList` helper. Expose a new `count` column from the RPC, propagate it through the server action, and add a formatting rule in `formatShareList` that appends ` ×N` when `count >= 3`. No UI changes.

**Tech Stack:** TypeScript, Supabase (Postgres RPC), Vitest, Next.js Server Actions.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/062_get_user_share_list.sql` | SQL function returning group/sticker rows + new `count INT` column. |
| `lib/format-sticker-list.ts` | Pure function that turns grouped stickers into a WhatsApp-ready text block; gains a `count` field on `ShareStickerItem` and a `count >= 3` suffix rule. |
| `lib/format-sticker-list.test.ts` | (new) Vitest tests for `formatShareList` covering the new rule and unchanged behavior for `missing` and `count = 2`. |
| `app/p/[username]/lib/get-shareable-list.ts` | Server action that calls the RPC and shapes the data; reads the new `count` column and forwards it to the formatter. |
| `docs/superpowers/specs/2026-06-16-share-duplicates-count-design.md` | Spec (already exists, referenced for context). |

---

## Task 1: Add failing tests for `formatShareList` count rule

**Files:**
- Create: `lib/format-sticker-list.test.ts`

- [ ] **Step 1: Create the test file**

```ts
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
        { code: "MEX1", title: null, count: 3 },
        { code: "MEX2", title: null, count: 2 },
      ],
    },
  ],
  profileUrl: "https://faltauma.com/p/maria",
};

describe("formatShareList — duplicates", () => {
  it("mostra ×N ao lado do código quando count >= 3", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", title: null, count: 3 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("MEX1 ×3");
  });

  it("omite o sufixo quando count é 2", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX2", title: null, count: 2 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("MEX2");
    expect(text).not.toContain("MEX2 ×");
  });

  it("mistura stickers com e sem sufixo no mesmo grupo", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("MEX1 ×3");
    expect(text).toContain("MEX2");
    // garante que MEX2 não ganhou sufixo
    expect(text).not.toMatch(/MEX2 ×/);
  });

  it("suporta count alto (10)", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [{ code: "BRA7", title: null, count: 10 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("BRA7 ×10");
  });

  it("header usa totalCount (stickers únicos) sem multiplicar por count", () => {
    const text = formatShareList({
      ...baseInput,
      totalCount: 3,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", title: null, count: 5 }],
        },
      ],
    });
    expect(text).toContain("Repetidas (3):");
  });
});

describe("formatShareList — missing", () => {
  it("não usa sufixo ×N mesmo com count = 0", () => {
    const text = formatShareList({
      ...baseInput,
      kind: "missing",
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", title: null, count: 0 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("MEX1");
    expect(text).not.toMatch(/MEX1 ×/);
    expect(text).toContain("Faltam (1):");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/format-sticker-list.test.ts`
Expected: FAIL — TypeScript error because `ShareStickerItem` does not yet accept `count`, and the `×N` rule is not yet implemented.

- [ ] **Step 3: Commit (just the failing test)**

```bash
git add lib/format-sticker-list.test.ts
git commit -m "test: cover share-list count formatting rule"
```

---

## Task 2: Implement the formatting rule in `formatShareList`

**Files:**
- Modify: `lib/format-sticker-list.ts:5-8` (extend type)
- Modify: `lib/format-sticker-list.ts:46` (formatting rule)

- [ ] **Step 1: Extend `ShareStickerItem` with `count`**

Replace:

```ts
export interface ShareStickerItem {
  code: string;
  title: string | null;
}
```

with:

```ts
export interface ShareStickerItem {
  code: string;
  title: string | null;
  count: number;
}
```

- [ ] **Step 2: Apply the `>= 3` suffix rule**

Replace:

```ts
    lines.push(group.stickers.map((sticker) => sticker.code).join(", "));
```

with:

```ts
    lines.push(
      group.stickers
        .map((sticker) =>
          sticker.count >= 3 ? `${sticker.code} ×${sticker.count}` : sticker.code
        )
        .join(", ")
    );
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npx vitest run lib/format-sticker-list.test.ts`
Expected: PASS — all 6 test cases pass.

- [ ] **Step 4: Commit**

```bash
git add lib/format-sticker-list.ts
git commit -m "feat(format-share-list): show ×N for stickers with 3+ copies"
```

---

## Task 3: Add `count` column to the `get_user_share_list` RPC

**Files:**
- Modify: `supabase/migrations/062_get_user_share_list.sql`

- [ ] **Step 1: Update the RETURNS TABLE to add `count`**

Replace:

```sql
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT
)
```

with:

```sql
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT,
  count INT
)
```

- [ ] **Step 2: Project the count in the SELECT**

Replace the SELECT block:

```sql
  SELECT
    s.group_id,
    g.name AS group_name,
    g.code AS group_code,
    s.id AS sticker_id,
    s.code AS sticker_code,
    s.number AS sticker_number,
    s.title AS sticker_title
  FROM public.stickers s
```

with:

```sql
  SELECT
    s.group_id,
    g.name AS group_name,
    g.code AS group_code,
    s.id AS sticker_id,
    s.code AS sticker_code,
    s.number AS sticker_number,
    s.title AS sticker_title,
    COALESCE(c.cnt, 0) AS count
  FROM public.stickers s
```

(Keep everything else in the migration body — the `JOIN`, `LEFT JOIN`,
`WHERE`, `ORDER BY`, and the `GRANT` statement — unchanged.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/062_get_user_share_list.sql
git commit -m "feat(db): expose count column on get_user_share_list"
```

---

## Task 4: Propagate `count` through the server action

**Files:**
- Modify: `app/p/[username]/lib/get-shareable-list.ts:34-52`

- [ ] **Step 1: Add `count` to the local `ShareRow` type**

Replace:

```ts
  type ShareRow = {
    group_id: number;
    group_name: string;
    group_code: string;
    sticker_id: number;
    sticker_code: string;
    sticker_number: number;
    sticker_title: string | null;
  };
```

with:

```ts
  type ShareRow = {
    group_id: number;
    group_name: string;
    group_code: string;
    sticker_id: number;
    sticker_code: string;
    sticker_number: number;
    sticker_title: string | null;
    count: number;
  };
```

- [ ] **Step 2: Forward `count` when pushing into the bucket**

Replace:

```ts
    bucket.stickers.push({ code: row.sticker_code, title: row.sticker_title });
```

with:

```ts
    bucket.stickers.push({
      code: row.sticker_code,
      title: row.sticker_title,
      count: row.count,
    });
```

- [ ] **Step 3: Type-check the project**

Run: `npx tsc --noEmit`
Expected: 0 errors. The server action is the only consumer of the RPC
output and now matches the new `count` column.

- [ ] **Step 4: Run the unit tests one more time**

Run: `npx vitest run lib/format-sticker-list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/p/[username]/lib/get-shareable-list.ts
git commit -m "feat(share): propagate sticker count from RPC to formatter"
```

---

## Self-Review

- Spec coverage:
  - Rule "2 sem sufixo, 3+ com sufixo" → Task 1 tests + Task 2 implementation.
  - `count` no RPC → Task 3.
  - Propagação no server action → Task 4.
  - Faltantes inalterado → Task 1 tem teste específico de `missing` com `count: 0`.
  - `totalCount` no header é soma de stickers únicos → Task 1 tem teste que afirma o header com `totalCount: 3` e `count: 5`.
- No placeholders, no "implement later", no vague "handle edge cases".
- Type consistency: `ShareStickerItem.count` é definido em Task 2 e usado em Task 1, Task 2 e Task 4 (mesmo nome e mesmo tipo `number` em todos os pontos).
