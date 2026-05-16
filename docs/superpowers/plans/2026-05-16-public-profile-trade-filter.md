# Public Profile Trade Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a logged-in user views another user's `/p/:username` page, the **Faltam** and **Repetidas** tabs show only the trade-viable intersection (what the viewer can give to / receive from the profile owner). Adds a "Propor troca" button above the tabs that opens an under-construction dialog (placeholder for the future selection flow).

**Architecture:** Existing RPC `get_public_stickers` is extended with an optional `p_viewer_id UUID DEFAULT NULL` parameter. When passed and different from the owner, the RPC applies the intersection (missing-for-owner ∩ duplicates-of-viewer for the Missing tab; duplicates-of-owner ∩ missing-for-viewer for the Duplicates tab). All filtering, search, sorting, and pagination stay server-side. The page server component computes the two intersection totals (used for tab labels and button enabled state) in JS from the owner's and viewer's `user_stickers` rows — no extra RPC needed. The new dialog is co-located with the route as `trade-proposal-dialog.tsx`.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, Supabase (SSR client, Postgres RPC, RLS), shadcn `dialog` + `button`, lucide-react `Construction` icon.

**Spec:** `docs/superpowers/specs/2026-05-15-public-profile-trade-filter-design.md`

**Note on testing:** This project has **no test framework configured** (no `vitest`/`jest` in `package.json`). The plan does NOT use TDD — verification is via TypeScript build, ESLint, and explicit manual steps in the dev server. Do **not** add a test framework as part of this work.

---

## File Layout

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/026_public_stickers_trade_filter.sql` | new | `DROP` + `CREATE` of `get_public_stickers` adding optional `p_viewer_id` and intersection logic. |
| `app/p/[username]/trade-proposal-dialog.tsx` | new | Client component — shadcn `Dialog` with the under-construction copy. No API calls. |
| `app/p/[username]/profile-stickers.tsx` | modify | Accept new (optional) props, pass `p_viewer_id` to the RPC, render the "Propor troca" button above the tabs, hint text under filters, empty-state copy for the trade case, mount the dialog. |
| `app/p/[username]/page.tsx` | modify | Determine viewer-owner relationship, conditionally fetch viewer's `user_stickers`, compute `tradeMissingCount` / `tradeDuplicatesCount`, pass the new props to `ProfileStickers`. |

---

## Task 1: Add migration extending `get_public_stickers` with `p_viewer_id`

**Files:**
- Create: `supabase/migrations/026_public_stickers_trade_filter.sql`

- [ ] **Step 1: Confirm `025` is the highest existing migration**

Run: `ls supabase/migrations | sort | tail -3`

Expected output ends with:
```
023_public_stickers_add_title.sql
024_add_sticker_count_to_profiles.sql
025_admin_stickers_write.sql
```

If `026_*` already exists, STOP and ask the user — the plan assumes `026` is free.

- [ ] **Step 2: Create the migration file**

Write `supabase/migrations/026_public_stickers_trade_filter.sql` with this exact content:

```sql
-- Extend get_public_stickers with an optional p_viewer_id parameter.
-- When p_viewer_id is non-null and different from p_user_id, the RPC
-- returns only the trade-viable intersection:
--   missing tab     -> owner is missing AND viewer has a duplicate (cnt > 1)
--   duplicates tab  -> owner has a duplicate (cnt > 1) AND viewer is missing
-- When p_viewer_id is null (or equals p_user_id), the function behaves
-- byte-for-byte like the previous version.

DROP FUNCTION IF EXISTS get_public_stickers;

CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  group_name TEXT,
  duplicate_count INT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total BIGINT;
  v_apply_filter BOOLEAN := p_viewer_id IS NOT NULL AND p_viewer_id <> p_user_id;
BEGIN
  IF p_tab = 'missing' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      0 AS duplicate_count,
      v_total AS total_count
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;

  ELSIF p_tab = 'duplicates' THEN
    SELECT COUNT(*) INTO v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_apply_filter OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      (dupes.cnt - 1)::INT AS duplicate_count,
      v_total AS total_count
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_apply_filter OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;
```

- [ ] **Step 3: Apply migration to the linked Supabase project**

Run: `npx supabase db push`

Expected: command completes without error and prints `026_public_stickers_trade_filter` as applied. If a different command is used in this repo (e.g. `supabase migration up`), check the prior migration's PR / commit to confirm the convention. If neither works, ask the user how migrations are applied here.

- [ ] **Step 4: Verify the function signature and that it still answers existing calls**

In Supabase Studio SQL Editor (or `npx supabase db remote query`), run:

```sql
SELECT pg_get_function_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_public_stickers';
```

Expected output contains `p_viewer_id uuid DEFAULT NULL` at the end.

Then run a smoke query (replace `'<owner-uuid>'` with any seeded user id):

```sql
SELECT id, code, total_count
FROM get_public_stickers('<owner-uuid>'::uuid, 'missing', NULL, NULL, 1, 5);
```

Expected: up to 5 rows; behaves the same as before this migration. The "no `p_viewer_id`" path is unchanged.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/026_public_stickers_trade_filter.sql
git commit -m "feat(stickers): add p_viewer_id filter to get_public_stickers RPC"
```

---

## Task 2: Create the under-construction `TradeProposalDialog`

**Files:**
- Create: `app/p/[username]/trade-proposal-dialog.tsx`

- [ ] **Step 1: Create the component file**

Write `app/p/[username]/trade-proposal-dialog.tsx` with this exact content:

```tsx
"use client";

import { Construction } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TradeProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-400" />
            Em construção
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-300">
          Em breve você vai poder selecionar as figurinhas pra oferecer e as que
          quer receber, e enviar uma proposta de troca direto por aqui.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. The component is not yet referenced by anything; this confirms the imports resolve.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: no new errors. The component is unused; if the lint config flags unused exports, ignore — Task 3 wires it up.

- [ ] **Step 4: Commit**

```bash
git add app/p/\[username\]/trade-proposal-dialog.tsx
git commit -m "feat(profile): add under-construction TradeProposalDialog"
```

---

## Task 3: Wire trade filter into `profile-stickers.tsx`

**Files:**
- Modify: `app/p/[username]/profile-stickers.tsx`

All new props are **optional** with safe defaults so this task's commit can land without touching `page.tsx` (Task 4 will pass real values). The component must continue to render unchanged when the new props are absent.

- [ ] **Step 1: Add the new imports at the top of the file**

Open `app/p/[username]/profile-stickers.tsx`. Locate the existing import block (lines 1–19). Add the dialog import and a `useState` is already present. Add **after** the existing imports (after the `PaginationControl` import line):

```tsx
import { TradeProposalDialog } from "./trade-proposal-dialog";
```

- [ ] **Step 2: Extend the component's props type and signature**

Find the existing `export function ProfileStickers({ ... })` block (around line 39). Replace the function signature (the destructure and its type annotation) with:

```tsx
export function ProfileStickers({
  userId,
  viewerId = null,
  tradeFilterActive = false,
  ownerUsername,
  groups,
  missingCount,
  duplicatesCount,
  tradeMissingCount = null,
  tradeDuplicatesCount = null,
}: {
  userId: string;
  viewerId?: string | null;
  tradeFilterActive?: boolean;
  ownerUsername: string;
  groups: Group[];
  missingCount: number;
  duplicatesCount: number;
  tradeMissingCount?: number | null;
  tradeDuplicatesCount?: number | null;
}) {
```

`ownerUsername` stays **required** because it's used in the button copy and there's no sensible default. Task 4 will pass it from `page.tsx`. This means `tsc` will fail at the call site in `page.tsx` until Task 4's commit lands — that's the intended transient break. The other new props are optional with defaults precisely so this gap is the only one.

- [ ] **Step 3: Add the dialog state and effective-count helpers inside the function body**

Right after the existing `const totalPages = Math.ceil(totalCount / PAGE_SIZE);` line, add:

```tsx
  const [tradeOpen, setTradeOpen] = useState(false);

  const effectiveMissingCount = tradeFilterActive
    ? tradeMissingCount ?? 0
    : missingCount;
  const effectiveDuplicatesCount = tradeFilterActive
    ? tradeDuplicatesCount ?? 0
    : duplicatesCount;

  const tradeButtonDisabled =
    (tradeMissingCount ?? 0) + (tradeDuplicatesCount ?? 0) === 0;
```

- [ ] **Step 4: Pass `p_viewer_id` to the RPC**

Locate the `fetchStickers` `useCallback` (around lines 61–81). Find the `supabase.rpc("get_public_stickers", { ... })` call. Replace the params object with:

```tsx
    const { data } = await supabase.rpc("get_public_stickers", {
      p_user_id: userId,
      p_tab: tab,
      p_group_id: groupId,
      p_keyword: keyword || null,
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_viewer_id: viewerId,
    });
```

Then update the dependency array of the `useCallback` (at the closing line) to include `viewerId`:

```tsx
  }, [userId, tab, groupId, keyword, page, viewerId]);
```

- [ ] **Step 5: Use the effective counts in the tab labels**

Locate the tab buttons (around lines 95–116). Replace `missingCount` and `duplicatesCount` in the JSX with the effective values:

- `Faltam ({missingCount})` → `Faltam ({effectiveMissingCount})`
- `Repetidas ({duplicatesCount})` → `Repetidas ({effectiveDuplicatesCount})`

- [ ] **Step 6: Add the "Propor troca" row above the tabs**

Find the opening of the returned JSX:

```tsx
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
```

Insert the trade button row **between** the outer `<div className="space-y-4">` opening and the `{/* Tabs */}` comment:

```tsx
  return (
    <div className="space-y-4">
      {tradeFilterActive && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-white">
            Quer trocar com <span className="font-semibold">@{ownerUsername}</span>?
          </p>
          <button
            type="button"
            disabled={tradeButtonDisabled}
            title={tradeButtonDisabled ? "Sem trocas viáveis no momento" : undefined}
            onClick={() => setTradeOpen(true)}
            className="w-full sm:w-auto rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:bg-gray-600 transition-colors"
          >
            Propor troca
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
```

- [ ] **Step 7: Add the hint text between the filters and the grid**

Locate the closing of the `{/* Filters */}` block — it ends right before `{/* Grid */}` (around line 170). Between the closing `</div>` of the filters row and the opening of the grid, insert:

```tsx
      {tradeFilterActive && (
        <p className="text-xs text-gray-400">
          Mostrando só figurinhas que combinam com seu álbum.
        </p>
      )}

      {/* Grid */}
```

- [ ] **Step 8: Update the empty state copy**

Locate the empty-state block (around lines 178–183):

```tsx
      {!loading && results.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhuma figurinha encontrada.</p>
        </div>
      )}
```

Replace the inner `<p>` element with:

```tsx
          <p className="text-gray-400 text-sm">
            {tradeFilterActive
              ? "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria no momento."
              : "Nenhuma figurinha encontrada."}
          </p>
```

- [ ] **Step 9: Render the dialog at the bottom of the returned JSX**

Find the closing `</div>` that wraps the whole component return (matches the outer `<div className="space-y-4">`). Just **before** that closing `</div>`, insert:

```tsx
      <TradeProposalDialog open={tradeOpen} onOpenChange={setTradeOpen} />
```

- [ ] **Step 10: Type-check (allows Task 4 to be the build-fix commit)**

Run: `npx tsc --noEmit`

Expected: **failure** at `app/p/[username]/page.tsx` because `ownerUsername`, `viewerId`, `tradeFilterActive`, `tradeMissingCount`, and `tradeDuplicatesCount` are not yet passed from the page. This is the transient break called out in Step 2. `profile-stickers.tsx` itself should have no errors.

If `profile-stickers.tsx` itself has type errors, fix them now before committing.

- [ ] **Step 11: Commit**

The build won't be fully green yet (Task 4 fixes the caller), but this is a coherent unit of work. Commit it:

```bash
git add app/p/\[username\]/profile-stickers.tsx
git commit -m "feat(profile): wire trade filter UI into profile-stickers"
```

---

## Task 4: Compute trade stats and pass props from `page.tsx`

**Files:**
- Modify: `app/p/[username]/page.tsx`

- [ ] **Step 1: Determine the viewer/owner relationship and conditionally fetch viewer's stickers**

Open `app/p/[username]/page.tsx`. Locate the `// Stats` comment block (around lines 66–85). Replace it (the entire block from `// Stats` through `const percent = ...`) with:

```tsx
  // Stats — owner's totals (always computed for the hero).
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", profile.id);

  const { count: totalStickers } = await supabase
    .from("stickers")
    .select("id", { count: "exact", head: true });

  const ownerOwned = new Set<number>();
  const ownerDupes = new Set<number>();
  for (const us of userStickers ?? []) {
    if (ownerOwned.has(us.sticker_id)) ownerDupes.add(us.sticker_id);
    ownerOwned.add(us.sticker_id);
  }

  const uniqueOwned = ownerOwned.size;
  const total = totalStickers ?? 0;
  const totalMissing = total - uniqueOwned;
  const totalDuplicates = ownerDupes.size;
  const percent = total > 0 ? Math.round((uniqueOwned / total) * 100) : 0;

  // Trade intersection stats — only when a different logged-in viewer is looking.
  const isOwnProfile = user?.id === profile.id;
  const tradeFilterActive = !!user && !isOwnProfile;

  let viewerId: string | null = null;
  let tradeMissingCount: number | null = null;
  let tradeDuplicatesCount: number | null = null;

  if (tradeFilterActive && user) {
    viewerId = user.id;

    const { data: viewerStickers } = await supabase
      .from("user_stickers")
      .select("sticker_id")
      .eq("user_id", user.id);

    const viewerCount = new Map<number, number>();
    for (const vs of viewerStickers ?? []) {
      viewerCount.set(vs.sticker_id, (viewerCount.get(vs.sticker_id) ?? 0) + 1);
    }
    const viewerDupes = new Set<number>();
    for (const [id, c] of viewerCount) {
      if (c > 1) viewerDupes.add(id);
    }

    // Faltam pro dono que o viewer tem repetida
    let missingMatch = 0;
    for (const id of viewerDupes) {
      if (!ownerOwned.has(id)) missingMatch++;
    }
    tradeMissingCount = missingMatch;

    // Repetidas do dono que o viewer não tem
    let dupesMatch = 0;
    for (const id of ownerDupes) {
      if (!viewerCount.has(id)) dupesMatch++;
    }
    tradeDuplicatesCount = dupesMatch;
  }
```

The previous `stickerCount` Map and per-loop derivations are replaced with two `Set`s — same semantics for `uniqueOwned`/`totalDuplicates` but reusable for the intersection comparison.

- [ ] **Step 2: Pass the new props to `ProfileStickers`**

Locate the `<ProfileStickers ... />` block (around lines 107–112). Replace it with:

```tsx
        <ProfileStickers
          userId={profile.id}
          viewerId={viewerId}
          tradeFilterActive={tradeFilterActive}
          ownerUsername={profile.username}
          groups={groups ?? []}
          missingCount={totalMissing}
          duplicatesCount={totalDuplicates}
          tradeMissingCount={tradeMissingCount}
          tradeDuplicatesCount={tradeDuplicatesCount}
        />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. The transient break from Task 3 is now closed.

- [ ] **Step 4: Lint**

Run: `npm run lint`

Expected: no new errors or warnings.

- [ ] **Step 5: Commit**

```bash
git add app/p/\[username\]/page.tsx
git commit -m "feat(profile): compute trade intersection and pass props to ProfileStickers"
```

---

## Task 5: Production build and manual end-to-end verification

**Files:** none modified.

- [ ] **Step 1: Production build**

Run: `npm run build`

Expected: build completes successfully. If it fails, fix the issue and re-run before continuing.

- [ ] **Step 2: Lint clean**

Run: `npm run lint`

Expected: no errors and no warnings introduced by this branch.

- [ ] **Step 3: Smoke test as anonymous visitor**

Run: `npm run dev` (kill any prior instance with Ctrl+C). In an **incognito** window, open `http://localhost:3000/p/<some-existing-username>` (pick any username with stickers).

Verify:
- "Propor troca" row is **not** rendered.
- Tab counters match the values you got before the migration (full owner totals).
- Hint text "Mostrando só figurinhas que combinam com seu álbum." is **not** rendered.
- Empty state (filter by a group that has nothing) shows the generic message "Nenhuma figurinha encontrada."

- [ ] **Step 4: Smoke test as logged-in viewer on someone else's profile**

In a regular window, sign in as user **A**. Navigate to `/p/<username-of-user-B>` where B has at least one duplicate that A is missing and vice-versa.

Verify:
- "Quer trocar com @<B>?" row is rendered above the tabs with a green "Propor troca" button.
- Tab counters reflect the **intersection** (likely much smaller than B's actual totals shown in the hero).
- Hero stats are unchanged (still B's real totals/percent).
- Hint text "Mostrando só figurinhas que combinam com seu álbum." appears between the filters and the grid.
- Switching tabs preserves the trade-filtered behavior.
- Click "Propor troca" → the under-construction dialog opens with the Construction icon and the copy from the spec. Click "Fechar" → dialog closes.

- [ ] **Step 5: Smoke test as logged-in viewer on own profile**

Still signed in as A, navigate to `/p/<username-of-A>`.

Verify:
- "Propor troca" row is **not** rendered.
- Tab counters match the full owner totals (same as in Step 3 but for A).
- No hint text.

- [ ] **Step 6: Smoke test the zero-intersection case**

As A, navigate to `/p/<username-of-B>` where A and B have **no overlap** (e.g., both have only single-copies — easiest if A is a fresh user with no stickers).

Verify:
- "Propor troca" button is **disabled** with `cursor-not-allowed` and the native tooltip `Sem trocas viáveis no momento` on hover (desktop).
- Both tab counters read `(0)`.
- Empty state shows: "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria no momento."

- [ ] **Step 7: Smoke test with search and group filters**

As A, on `/p/<username-of-B>` with non-zero intersection, type a code in the search input and pick a group from the dropdown.

Verify:
- Results are filtered within the intersection (don't show stickers A and B can't trade).
- Pagination works (advance to page 2 if there are enough results).
- The tab counters do **not** change with search/group filter changes — they reflect the global intersection. (Pagination uses the RPC's `total_count` for the filtered count internally, but the tab labels read from the props.)

- [ ] **Step 8: Smoke test that the RPC's old call-shape still works**

In Supabase Studio SQL Editor:

```sql
SELECT id, code, total_count
FROM get_public_stickers('<owner-uuid>'::uuid, 'missing');
```

Expected: same shape as before this branch, with `p_viewer_id` defaulted to NULL.

- [ ] **Step 9: Open PR (only if explicitly requested by the user)**

Otherwise stop here — the user opens PRs manually with `gh pr create` or via the GitHub UI when they're ready.

---

## Self-Review Notes

- **Spec coverage:**
  - Behavior by viewer type (anon, self, logged-in-other) — Tasks 3 + 4 (`tradeFilterActive` derivation in `page.tsx`, conditional rendering in `profile-stickers.tsx`).
  - Tab counters reflect intersection — Task 3 Step 5.
  - Hero stats unchanged — Task 4 Step 1 keeps the hero props (`totalMissing`, `totalDuplicates`, etc.) intact.
  - Hint text — Task 3 Step 7.
  - "Propor troca" button (position, disabled state, tooltip, dialog open) — Task 3 Steps 6 + 9.
  - Empty state copy — Task 3 Step 8.
  - Filters keep working within intersection — covered by the RPC change in Task 1 (search/group clauses are still applied on top of the intersection clause).
  - Dialog component — Task 2.
  - Migration with optional `p_viewer_id` — Task 1.
  - Stats computed server-side without new RPC — Task 4 Step 1.
- **Error handling:** falsy `viewerStickers` falls back to `[]` (the `?? []` in the loops in Task 4 Step 1). RPC failure leaves `results = []` (existing behavior). Disabled button is a no-op (`<button disabled>`).
- **Edge cases:** zero stickers on either side handled by the `Set`/`Map` logic in Task 4 Step 1; ambos-zero handled by `tradeButtonDisabled` in Task 3 Step 3; self-view skipped via `isOwnProfile`; anon view skipped via `!!user`.
- **Type consistency:** `viewerId: string | null`, `tradeMissingCount: number | null`, `tradeDuplicatesCount: number | null` used identically across Tasks 3 and 4. `tradeFilterActive: boolean` is the single source of truth for "should we apply the filter UI".
- **Transient build break between Tasks 3 and 4:** explicitly called out in Task 3 Steps 2 and 10. Task 4 Step 3 closes it. The final verification in Task 5 catches anything missed.
- **No test framework introduced.** All verification is manual + `tsc` + `npm run lint` + `npm run build`, consistent with the project today.
