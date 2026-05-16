# Admin Metrics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing 4-KPI admin dashboard at `/admin` with a richer surface: 3 all-time KPI cards (Usuários, Figurinhas coletadas, Figurinhas trocadas as "Em breve"), a global date filter (presets 24h / 7d / 30d / 90d / Tudo), an auto granularity toggle, and two `ComposedChart`s — "Crescimento" (novos usuários por bucket + acumulado) and "Engajamento" (figurinhas coletadas por bucket + acumulado). Mobile-first, partner-demo polish.

**Architecture:** Two new Postgres RPCs (`get_admin_growth`, `get_admin_engagement`) do the bucketed aggregation with `date_trunc` + `generate_series` so empty buckets are filled and the cumulative line reflects the true running total since the first record. The page stays a server component for the KPI counts, mounting a client orchestrator (`AdminMetrics`) that owns the filter/granularity state and feeds a shared presentational `MetricChart` component.

**Tech Stack:** Next.js 16 (App Router, server + client components), React 19, Supabase (RPC + SECURITY DEFINER), recharts (`ComposedChart`), tailwind classes against the DS tokens (`brand-field`, `brand-field-2`, `brand-grass`, `brand-gold`).

**Spec:** `docs/superpowers/specs/2026-05-16-admin-metrics-design.md`

**Note on testing:** This project has **no test framework configured** (no `vitest`/`jest` in `package.json`). The plan does NOT use TDD — verification is via TypeScript build, ESLint, and explicit manual steps in the dev server. Do **not** add a test framework as part of this work.

---

## File Layout

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/027_admin_metrics_rpcs.sql` | new | Two `SECURITY DEFINER` RPCs that bucket `profiles` and `user_stickers` by `date_trunc(p_bucket, created_at)`, gated by `is_admin(auth.uid())`. |
| `app/admin/(dashboard)/metric-chart.tsx` | new | Presentational client component. Receives `title`, `data`, `bucket`, `loading`. Renders the `ComposedChart` with bar (`new_count`) + line (`cumulative`) or an empty state. |
| `app/admin/(dashboard)/admin-metrics.tsx` | new | Client orchestrator. Owns `range` and `bucket` state, computes the date window, fetches both RPCs in parallel with a `fetchVersionRef` race guard, and renders the filter pill bars plus two `MetricChart`s. |
| `app/admin/(dashboard)/page.tsx` | modify | Server component. Drops `figurinhas cadastradas` and `amizades` counts; renders 3 KPI cards (the third with `Em breve` badge); mounts `<AdminMetrics />` below. |

---

## Task 1: Add migration with the two metric RPCs

**Files:**
- Create: `supabase/migrations/027_admin_metrics_rpcs.sql`

- [ ] **Step 1: Confirm `026` is the highest existing migration**

Run: `ls supabase/migrations | sort | tail -3`

Expected output ends with:
```
024_add_sticker_count_to_profiles.sql
025_admin_stickers_write.sql
026_public_stickers_trade_filter.sql
```

If `027_*` already exists, STOP and ask the user — the plan assumes `027` is free.

- [ ] **Step 2: Create the migration file**

Write `supabase/migrations/027_admin_metrics_rpcs.sql` with this exact content:

```sql
-- Time-bucketed metrics for the admin dashboard. Both functions share
-- the same structure; the only difference is which table they aggregate.
-- p_start = NULL means "since the first record"; used by the "Tudo" preset.
-- The cumulative column is a true running total from the dawn of the
-- table, not just within the requested window (the `baseline` CTE
-- carries the count of rows that fell before v_start).

CREATE OR REPLACE FUNCTION get_admin_growth(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(bucket TIMESTAMPTZ, new_count INT, cumulative BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_interval INTERVAL;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_bucket NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Invalid bucket: %', p_bucket;
  END IF;

  v_end := COALESCE(p_end, now());
  v_start := COALESCE(p_start, (SELECT MIN(created_at) FROM public.profiles));

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_interval := ('1 ' || p_bucket)::INTERVAL;

  RETURN QUERY
  WITH buckets AS (
    SELECT generate_series(
      date_trunc(p_bucket, v_start),
      date_trunc(p_bucket, v_end),
      v_interval
    ) AS b
  ),
  all_buckets AS (
    SELECT
      date_trunc(p_bucket, p.created_at) AS b,
      COUNT(*) AS cnt
    FROM public.profiles p
    WHERE p.created_at < date_trunc(p_bucket, v_end) + v_interval
    GROUP BY 1
  ),
  baseline AS (
    SELECT COALESCE(SUM(cnt), 0)::BIGINT AS total
    FROM all_buckets
    WHERE b < date_trunc(p_bucket, v_start)
  ),
  joined AS (
    SELECT bk.b, COALESCE(ab.cnt, 0)::INT AS cnt
    FROM buckets bk
    LEFT JOIN all_buckets ab ON ab.b = bk.b
  )
  SELECT
    j.b AS bucket,
    j.cnt AS new_count,
    ((SELECT total FROM baseline) +
     SUM(j.cnt) OVER (ORDER BY j.b))::BIGINT AS cumulative
  FROM joined j
  ORDER BY j.b;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_engagement(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(bucket TIMESTAMPTZ, new_count INT, cumulative BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_interval INTERVAL;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_bucket NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Invalid bucket: %', p_bucket;
  END IF;

  v_end := COALESCE(p_end, now());
  v_start := COALESCE(p_start, (SELECT MIN(created_at) FROM public.user_stickers));

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_interval := ('1 ' || p_bucket)::INTERVAL;

  RETURN QUERY
  WITH buckets AS (
    SELECT generate_series(
      date_trunc(p_bucket, v_start),
      date_trunc(p_bucket, v_end),
      v_interval
    ) AS b
  ),
  all_buckets AS (
    SELECT
      date_trunc(p_bucket, us.created_at) AS b,
      COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.created_at < date_trunc(p_bucket, v_end) + v_interval
    GROUP BY 1
  ),
  baseline AS (
    SELECT COALESCE(SUM(cnt), 0)::BIGINT AS total
    FROM all_buckets
    WHERE b < date_trunc(p_bucket, v_start)
  ),
  joined AS (
    SELECT bk.b, COALESCE(ab.cnt, 0)::INT AS cnt
    FROM buckets bk
    LEFT JOIN all_buckets ab ON ab.b = bk.b
  )
  SELECT
    j.b AS bucket,
    j.cnt AS new_count,
    ((SELECT total FROM baseline) +
     SUM(j.cnt) OVER (ORDER BY j.b))::BIGINT AS cumulative
  FROM joined j
  ORDER BY j.b;
END;
$$;

REVOKE ALL ON FUNCTION get_admin_growth(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_admin_engagement(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_growth(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_engagement(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
```

- [ ] **Step 3: Apply migration to the linked Supabase project**

Run: `npx supabase db push`

Expected: command completes without error and prints `027_admin_metrics_rpcs` as applied. If the CLI errors with auth-related issues, check `supabase/.temp/linked-project.json` exists; if not, the user runs `npx supabase link` themselves.

- [ ] **Step 4: Verify both function signatures**

In Supabase Studio SQL Editor (or `npx supabase db query --linked "..."`), run:

```sql
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_admin_growth', 'get_admin_engagement')
ORDER BY p.proname;
```

Expected: two rows, each with args:
```
p_start timestamp with time zone DEFAULT NULL::timestamp with time zone,
p_end timestamp with time zone DEFAULT NULL::timestamp with time zone,
p_bucket text DEFAULT 'day'::text
```

Do not attempt to smoke-call the RPCs from psql/CLI — `auth.uid()` returns NULL there and the `is_admin` gate will raise. Functional smoke testing happens in Task 5 via the running app.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/027_admin_metrics_rpcs.sql
git commit -m "feat(admin): add growth and engagement metric RPCs"
```

---

## Task 2: Create the presentational `MetricChart` component

**Files:**
- Create: `app/admin/(dashboard)/metric-chart.tsx`

- [ ] **Step 1: Create the component file**

Write `app/admin/(dashboard)/metric-chart.tsx` with this exact content:

```tsx
"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BucketType = "hour" | "day" | "week" | "month";

type Row = { bucket: string; new_count: number; cumulative: number };

const BUCKET_LABEL: Record<BucketType, string> = {
  hour: "hora",
  day: "dia",
  week: "semana",
  month: "mês",
};

function formatBucket(iso: string, bucket: BucketType): string {
  const d = new Date(iso);
  if (bucket === "hour") {
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (bucket === "month") {
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function MetricChart({
  title,
  data,
  bucket,
  loading,
}: {
  title: string;
  data: Row[];
  bucket: BucketType;
  loading: boolean;
}) {
  const isEmpty =
    !loading && data.length > 0 && data.every((r) => r.new_count === 0);
  const isNoData = !loading && data.length === 0;
  const showEmptyState = isEmpty || isNoData;

  const chartData = data.map((r) => ({
    ...r,
    label: formatBucket(r.bucket, bucket),
  }));

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      {showEmptyState ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          Sem dados nesse período.
        </div>
      ) : (
        <div
          className={`h-60 sm:h-80 transition-opacity ${
            loading ? "opacity-50" : ""
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="label"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a3d2a",
                  border: "1px solid #155236",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar
                dataKey="new_count"
                name={`Novos por ${BUCKET_LABEL[bucket]}`}
                fill="#2d7d4f"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. The component is not yet referenced by anything; this confirms recharts imports resolve and the types compile.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: no new errors in `metric-chart.tsx`. Pre-existing errors elsewhere in the repo are not your concern.

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(dashboard\)/metric-chart.tsx
git commit -m "feat(admin): add MetricChart presentational component"
```

---

## Task 3: Create the `AdminMetrics` client orchestrator

**Files:**
- Create: `app/admin/(dashboard)/admin-metrics.tsx`

- [ ] **Step 1: Create the component file**

Write `app/admin/(dashboard)/admin-metrics.tsx` with this exact content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MetricChart } from "./metric-chart";

type RangePreset = "24h" | "7d" | "30d" | "90d" | "all";
type BucketType = "hour" | "day" | "week" | "month";

type Row = { bucket: string; new_count: number; cumulative: number };

const BUCKET_OPTIONS: Record<RangePreset, BucketType[]> = {
  "24h": ["hour"],
  "7d": ["hour", "day"],
  "30d": ["day", "week"],
  "90d": ["day", "week"],
  all: ["week", "month"],
};

const DEFAULT_BUCKET: Record<RangePreset, BucketType> = {
  "24h": "hour",
  "7d": "day",
  "30d": "day",
  "90d": "day",
  all: "week",
};

const RANGE_HOURS: Record<Exclude<RangePreset, "all">, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

const RANGE_LABEL: Record<RangePreset, string> = {
  "24h": "24h",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "Tudo",
};

const BUCKET_LABEL: Record<BucketType, string> = {
  hour: "Por hora",
  day: "Por dia",
  week: "Por semana",
  month: "Por mês",
};

const RANGE_ORDER: RangePreset[] = ["24h", "7d", "30d", "90d", "all"];

export function AdminMetrics() {
  const [range, setRange] = useState<RangePreset>("30d");
  const [bucket, setBucket] = useState<BucketType>(DEFAULT_BUCKET["30d"]);
  const [growth, setGrowth] = useState<Row[]>([]);
  const [engagement, setEngagement] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersionRef = useRef(0);

  const handleRangeChange = (r: RangePreset) => {
    setRange(r);
    setBucket(DEFAULT_BUCKET[r]);
  };

  useEffect(() => {
    const myVersion = ++fetchVersionRef.current;
    setLoading(true);

    const end = new Date();
    const start =
      range === "all"
        ? null
        : new Date(end.getTime() - RANGE_HOURS[range] * 3_600_000);

    const supabase = createClient();
    Promise.all([
      supabase.rpc("get_admin_growth", {
        p_start: start?.toISOString() ?? null,
        p_end: end.toISOString(),
        p_bucket: bucket,
      }),
      supabase.rpc("get_admin_engagement", {
        p_start: start?.toISOString() ?? null,
        p_end: end.toISOString(),
        p_bucket: bucket,
      }),
    ]).then(([g, e]) => {
      if (myVersion !== fetchVersionRef.current) return;
      setGrowth((g.data as Row[] | null) ?? []);
      setEngagement((e.data as Row[] | null) ?? []);
      setLoading(false);
    });
  }, [range, bucket]);

  const bucketOptions = BUCKET_OPTIONS[range];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANGE_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleRangeChange(r)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              range === r
                ? "bg-brand-grass text-white border border-brand-grass"
                : "bg-brand-field-2 text-white/70 border border-white/10 hover:bg-brand-field-2/80"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {bucketOptions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {bucketOptions.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                bucket === b
                  ? "bg-brand-grass text-white border border-brand-grass"
                  : "bg-brand-field-2 text-white/70 border border-white/10 hover:bg-brand-field-2/80"
              }`}
            >
              {BUCKET_LABEL[b]}
            </button>
          ))}
        </div>
      )}

      <MetricChart
        title="Crescimento"
        data={growth}
        bucket={bucket}
        loading={loading}
      />
      <MetricChart
        title="Engajamento"
        data={engagement}
        bucket={bucket}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. The component imports `MetricChart` from Task 2 — if that file is missing or its types changed, this step fails.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: no new errors in `admin-metrics.tsx`. Pre-existing errors elsewhere are unchanged.

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(dashboard\)/admin-metrics.tsx
git commit -m "feat(admin): add AdminMetrics client orchestrator with filter and granularity state"
```

---

## Task 4: Refactor `page.tsx` to the new 3-KPI layout and mount `AdminMetrics`

**Files:**
- Modify: `app/admin/(dashboard)/page.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/(dashboard)/page.tsx` with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { AdminMetrics } from "./admin-metrics";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: usersCount }, { count: userStickersCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_stickers").select("*", { count: "exact", head: true }),
  ]);

  const kpis: Array<{
    label: string;
    value: number | null;
    comingSoon?: boolean;
  }> = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Figurinhas coletadas", value: userStickersCount ?? 0 },
    { label: "Figurinhas trocadas", value: null, comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-gray-700 bg-gray-800 p-5 relative"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{k.label}</p>
              {k.comingSoon && (
                <span className="rounded bg-brand-gold/20 px-2 py-0.5 text-[10px] font-semibold text-brand-gold">
                  Em breve
                </span>
              )}
            </div>
            <p className="mt-1 text-3xl font-bold text-white">
              {k.value === null ? "—" : k.value.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      <AdminMetrics />
    </div>
  );
}
```

This drops the `stickersCount` and `friendshipsCount` queries (no longer used) and reduces the grid from 4 to 3 cards.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. This closes the chain — `page.tsx` references `AdminMetrics`, which references `MetricChart`. All three should compile cleanly together.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: no new errors. The pre-existing baseline (17 errors, 26 warnings in unrelated files) should be unchanged or reduced (since `page.tsx` is shrinking).

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(dashboard\)/page.tsx
git commit -m "feat(admin): replace KPI dashboard with 3 cards and metric charts"
```

---

## Task 5: Production build and manual smoke

**Files:** none modified.

- [ ] **Step 1: Production build**

Run: `npm run build`

Expected: build completes successfully. The new client components (`metric-chart.tsx`, `admin-metrics.tsx`) should compile and the `recharts` bundle should pull in (already used elsewhere). If the build fails, fix the issue and re-run.

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: no new errors. Baseline is 17 errors, 26 warnings (pre-existing in `collection-view.tsx`, `sticker-image-upload.tsx`, landing components, etc.). Confirm the count didn't grow.

- [ ] **Step 3: Smoke test as admin**

Run `npm run dev` (kill any prior instance). Sign in as an admin user and open `http://localhost:3000/admin`.

Verify in order:

1. **KPI cards.** Three cards: "Usuários" (>= 1), "Figurinhas coletadas" (>= 0), "Figurinhas trocadas". The third shows "—" with a yellow "Em breve" badge in the top-right corner. No fourth card.

2. **Default filter state.** Range pill bar shows five buttons; "30 dias" is active (highlighted green). Granularity bar shows "Por dia" and "Por semana"; "Por dia" is active.

3. **Crescimento chart.** A card with title "Crescimento", a bar series (green) and a line series (gold). Bars represent new users per day, line represents cumulative users since the first signup. Tooltip on hover shows "Novos por dia: N" and "Acumulado: N". Eixo X formatted as "DD mmm" (e.g., "16 mai").

4. **Engajamento chart.** Same structure, data from `user_stickers`. Bars = new sticker collections per day. Line = cumulative collections since the first record.

5. **Switch range to "24h".** Bucket pill bar disappears (only one option). Both charts re-fetch — eixo X formatted as "HH:MM" (e.g., "14:00"). If no users/collections in last 24h, the affected chart shows "Sem dados nesse período."

6. **Switch range to "7 dias".** Bucket bar reappears with "Por hora" and "Por dia"; "Por dia" is active. Eixo X is "DD mmm" with 7 entries.

7. **Toggle granularity within "7 dias" to "Por hora".** Charts re-fetch. Eixo X becomes "HH:MM" with up to 168 ticks (recharts auto-thins).

8. **Switch range to "Tudo".** Bucket bar shows "Por semana" / "Por mês"; "Por semana" is active. Acumulado line starts non-zero only if there's data; bars cover the full lifetime.

9. **Switch range back to "30 dias".** Bucket auto-resets to "Por dia". One round-trip (no double fetch flicker).

10. **Race guard.** Click range buttons rapidly (24h → 7d → 30d → 90d in <1s). Only the final state's data should land — no stale results painting over.

- [ ] **Step 4: Verify non-admin block**

Sign out, sign back in as a **non-admin** user. Open `/admin`. Expected: the layout's existing guard redirects to `/admin/login` (or whatever the existing behavior is). The RPCs would have rejected the request with "Forbidden" if it got that far — defense in depth.

- [ ] **Step 5: Open PR (only if explicitly requested by the user)**

Otherwise stop here — the user opens PRs manually with `gh pr create` or via the GitHub UI when they're ready.

---

## Self-Review Notes

- **Spec coverage:**
  - 3 KPI cards (Users, Coletadas, Trocadas as "Em breve") — Task 4 Step 1.
  - Range filter (5 presets, default 30d) — Task 3 Step 1.
  - Granularity toggle (per-preset options, default per preset, hidden when only one option) — Task 3 Step 1.
  - Two `ComposedChart`s with bar + line — Task 2 Step 1.
  - Server-side RPC with `SECURITY DEFINER` + `is_admin` gate + buckets via `generate_series` + cumulative via window function + baseline carry-over — Task 1 Step 2.
  - Mobile-first layout — Task 4 (1 col grid mobile, 3 col ≥ sm) + Task 2 (`h-60 sm:h-80`).
  - Empty state per chart — Task 2 Step 1 (`showEmptyState`).
  - Race guard via `fetchVersionRef` — Task 3 Step 1.
- **No new errors introduced.** Tasks 2/3/4 each end with `tsc --noEmit` and `npm run lint`. Task 5 confirms the production build.
- **Type consistency:** `Row = { bucket: string; new_count: number; cumulative: number }` is identical in `metric-chart.tsx` and `admin-metrics.tsx`. `BucketType` and `RangePreset` are local to `admin-metrics.tsx`; `BucketType` is also redeclared in `metric-chart.tsx` (intentional — it keeps the presentational component self-contained without cross-importing types).
- **No test framework introduced.** Verification is `tsc` + `npm run lint` + `npm run build` + manual smoke, consistent with prior plans.
- **Defense in depth:** the route's admin layout protects against UI access; the `is_admin()` check inside each RPC protects against direct PostgREST calls; the migration `REVOKE`/`GRANT` lines limit which Postgres roles can execute the function at all.
