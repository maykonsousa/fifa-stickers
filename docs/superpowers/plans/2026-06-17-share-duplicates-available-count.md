# Share Duplicates Available Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `(×(count - 1))` next to sticker codes in the shared duplicates list when the user has 3+ copies, where the value in parentheses is the number of copies available for trade (one stays in the album).

**Architecture:** Surgical edit to `formatShareList` and its tests. The data flow (DB → RPC → server action → formatter) is unchanged; only the formatter's template and the test assertions change. The trigger condition stays `count >= 3`; only the displayed value shifts from `count` to `count - 1`.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/format-sticker-list.ts` | Pure formatter — gains the `count - 1` shift in the suffix template. |
| `lib/format-sticker-list.test.ts` | Vitest tests — 3 assertions updated to expect `(×N)` with `N = count - 1`. |

No other files change. RPC, server action, types, and migrations are untouched.

---

## Task 1: Update tests to expect `(×(count - 1))`

**Files:**
- Modify: `lib/format-sticker-list.test.ts:24-76` (3 assertions)

- [ ] **Step 1: Update the "mostra ×N" assertion**

In the test `mostra ×N ao lado do código quando count >= 3`, replace:

```ts
    expect(text).toContain("MEX1 ×3");
```

with:

```ts
    expect(text).toContain("MEX1 (×2)");
```

- [ ] **Step 2: Update the "mistura" assertion**

In the test `mistura stickers com e sem sufixo no mesmo grupo`, replace:

```ts
    expect(text).toContain("MEX1 ×3");
```

with:

```ts
    expect(text).toContain("MEX1 (×2)");
```

- [ ] **Step 3: Update the "count alto (10)" assertion**

In the test `suporta count alto (10)`, replace:

```ts
    expect(text).toContain("BRA7 ×10");
```

with:

```ts
    expect(text).toContain("BRA7 (×9)");
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run lib/format-sticker-list.test.ts`
Expected: 3 tests fail (`mostra ×N...`, `mistura...`, `suporta count alto (10)`). The other 3 still pass (count=2 omits, header uses totalCount, missing has no suffix).

- [ ] **Step 5: Commit**

```bash
git add lib/format-sticker-list.test.ts
git commit -m "test: expect (×(count-1)) available copies in share list"
```

---

## Task 2: Implement the `(×(count - 1))` suffix template

**Files:**
- Modify: `lib/format-sticker-list.ts:47-53`

- [ ] **Step 1: Update the suffix template**

Replace:

```ts
    lines.push(
      group.stickers
        .map((sticker) =>
          sticker.count >= 3 ? `${sticker.code} ×${sticker.count}` : sticker.code
        )
        .join(", ")
    );
```

with:

```ts
    lines.push(
      group.stickers
        .map((sticker) =>
          sticker.count >= 3 ? `${sticker.code} (×${sticker.count - 1})` : sticker.code
        )
        .join(", ")
    );
```

(Trigger stays `count >= 3`. Displayed value is `count - 1` — copies available for trade, since one stays in the album.)

- [ ] **Step 2: Run the tests and verify all pass**

Run: `npx vitest run lib/format-sticker-list.test.ts`
Expected: PASS — all 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/format-sticker-list.ts
git commit -m "feat(format-share-list): show (×(count-1)) available copies"
```

---

## Self-Review

- **Spec coverage:**
  - count=2 → sem sufixo → covered by existing `omite o sufixo quando count é 2`
  - count=3 → `(×2)` → covered by updated `mostra ×N...`
  - count=10 → `(×9)` → covered by updated `suporta count alto (10)`
  - mixed group → covered by updated `mistura...`
  - totalCount inalterado → covered by existing `header usa totalCount...`
  - missing inalterado → covered by existing `não usa sufixo ×N mesmo com count = 0`
- **Placeholder scan:** no TBD/TODO/vague steps.
- **Type consistency:** no types change. `count: number` semantics unchanged (still total copies in DB).