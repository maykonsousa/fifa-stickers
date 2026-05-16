# Admin — dashboard com métricas de crescimento e engajamento

**Data:** 2026-05-16
**Rota afetada:** `/admin` (server component `app/admin/(dashboard)/page.tsx`)

## Contexto

Hoje `/admin` é só 4 KPI cards (`usuários`, `figurinhas cadastradas`, `figurinhas coletadas`, `amizades ativas`) sem séries temporais nem filtros. Precisamos transformar essa página em um dashboard com métricas suficientes pra (a) entender o crescimento da base e (b) confirmar que usuários estão de fato adicionando figurinhas, com qualidade visual pra apresentar a parceiros em tela.

## Requisitos

- Métricas focadas em **crescimento da base** (novos usuários) e **engajamento** (figurinhas coletadas). Ranking de figurinhas e métricas sociais ficam fora desta rodada.
- Filtro de data por presets: **24h, 7 dias, 30 dias, 90 dias, Tudo**. Default `30 dias`.
- Toggle de **granularidade** dos buckets, com opções coerentes por preset (auto-ajusta no troca de preset).
- Layout em **single scroll, mobile-first**. Filtro global no topo, KPI cards abaixo, seções "Crescimento" e "Engajamento" em sequência.
- Polish suficiente pra demo a parceiros: tipografia consistente, cores da paleta do DS, sem placeholders feios.

## UX

### Estrutura vertical da página

```
Dashboard (h1)
├─ Filtro de data — pill bar [ 24h ] [ 7d ] [ 30d ] [ 90d ] [ Tudo ]
├─ Toggle de granularidade — pill bar (oculto quando só há 1 opção)
├─ KPI cards — grid 1 col mobile, 3 cols ≥ sm
│  • Usuários (all-time)
│  • Figurinhas coletadas (all-time)
│  • Figurinhas trocadas (placeholder "—" com badge "Em breve")
├─ Seção Crescimento — ComposedChart (barras=novos por bucket, linha=acumulado)
└─ Seção Engajamento — ComposedChart (barras=figurinhas coletadas por bucket, linha=acumulado)
```

### Filtro de data

Cinco botões pill, um ativo:
- Inativo: `bg-brand-field-2 text-white/70 border border-white/10 rounded-md px-3 py-1.5 text-sm font-medium`
- Ativo: `bg-brand-grass text-white border-brand-grass`

Default: **30d**.

### Toggle de granularidade

Opções por preset (mostra só se houver mais de uma):

| Preset | Opções | Default |
|---|---|---|
| 24h | Por hora | (oculto) |
| 7d | Por hora · Por dia | dia |
| 30d | Por dia · Por semana | dia |
| 90d | Por dia · Por semana | dia |
| Tudo | Por semana · Por mês | semana |

Ao mudar o preset, o `bucket` é redefinido pro default correspondente (porque o anterior pode não estar em `BUCKET_OPTIONS[novoPreset]`).

### KPI cards (3, all-time)

- **Usuários** — `count(*)` em `profiles`.
- **Figurinhas coletadas** — `count(*)` em `user_stickers`.
- **Figurinhas trocadas** — valor `"—"`, badge `Em breve` em `bg-brand-gold/20 text-brand-gold rounded px-2 py-0.5 text-[10px] font-semibold` no canto superior direito. Texto sem tooltip; o badge sozinho comunica a intenção.

KPIs **não respeitam o filtro de data** — são totais all-time. O filtro afeta apenas os charts abaixo.

### Charts (`ComposedChart` do recharts)

Mesmo formato pra Crescimento e Engajamento:
- **Barras** (`Bar dataKey="new_count" fill="#2d7d4f"` — `brand-grass`): novos no bucket.
- **Linha** (`Line dataKey="cumulative" stroke="#fbbf24"` — `brand-gold`): acumulado real desde o primeiro registro da tabela.
- Eixo X com label formatado conforme granularidade (`"14:00"`, `"16 mai"`, `"Mai/26"`).
- Tooltip dark (`bg #0a3d2a`, border `#155236`) com label "Novos por dia/hora/semana/mês" + "Acumulado".
- Altura: 240px em mobile, 320px em ≥ sm.
- Eixo Y único, auto-escala, `allowDecimals={false}`.

### Estado vazio dos charts

Quando a RPC retorna buckets e todos têm `new_count === 0`, renderiza um placeholder cinza "Sem dados nesse período." no lugar do gráfico. O acumulado pode existir, mas se nenhum delta cai no período selecionado, mostrar uma linha flat sem barras é confuso.

### Estados de loading e erro

- **Loading** inicial ou em troca de filtro: charts em `opacity-50` (container com height fixo evita layout shift).
- **Erro de RPC**: trata como `data = []` → empty state. Sem toast — admin não precisa do feedback extra; erro real aparece no console.
- **Race condition**: `fetchVersionRef` invalida fetches superseded por troca de filtro rápida (mesmo padrão usado em `profile-stickers.tsx`).

## Camada de dados

### Migration `027_admin_metrics_rpcs.sql`

Duas RPCs com a mesma forma — uma sobre `profiles`, outra sobre `user_stickers`. Ambas `SECURITY DEFINER` com check de `is_admin(auth.uid())`.

```sql
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

  v_end   := COALESCE(p_end, now());
  v_start := COALESCE(p_start, (SELECT MIN(created_at) FROM public.profiles));

  IF v_start IS NULL THEN
    RETURN; -- base vazia
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

  v_end   := COALESCE(p_end, now());
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

**Pontos chave:**
- `p_start = NULL` significa "desde o primeiro registro" — usado pelo preset "Tudo".
- `baseline` somatiza tudo antes do `v_start`, garantindo que a linha de `cumulative` no primeiro bucket já reflete o estado real (não começa em zero).
- `SUM(...) OVER (ORDER BY ...)` faz running sum em uma passada (sem N+1).
- `generate_series` cria buckets vazios → chart contínuo sem buracos.
- Validação de `p_bucket` antes do `||` evita SQL injection no interval.
- `is_admin()` gate redundante com o layout, mas é defesa em profundidade contra chamadas diretas via PostgREST.

**RLS:** `profiles` e `user_stickers` já têm `SELECT TO anon` (migration 021), então `SECURITY DEFINER` não muda exposição de leitura. A barreira efetiva é o check `is_admin`.

## Cliente

### `app/admin/(dashboard)/page.tsx` (modify, server component)

```tsx
import { createClient } from "@/lib/supabase/server";
import { AdminMetrics } from "./admin-metrics";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: usersCount }, { count: userStickersCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_stickers").select("*", { count: "exact", head: true }),
  ]);

  const kpis = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Figurinhas coletadas", value: userStickersCount ?? 0 },
    { label: "Figurinhas trocadas", value: null, comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-gray-700 bg-gray-800 p-5 relative">
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

Drops o card de "Figurinhas cadastradas" (sem valor pro objetivo) e o de "Amizades ativas" (fora de escopo nesta rodada). Coloca o de "Figurinhas trocadas" no terceiro slot com badge.

### `app/admin/(dashboard)/admin-metrics.tsx` (new, client component)

Responsabilidade: orquestrar filtro + granularidade + fetch das duas RPCs.

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
  "7d":  ["hour", "day"],
  "30d": ["day", "week"],
  "90d": ["day", "week"],
  "all": ["week", "month"],
};

const DEFAULT_BUCKET: Record<RangePreset, BucketType> = {
  "24h": "hour",
  "7d":  "day",
  "30d": "day",
  "90d": "day",
  "all": "week",
};

const RANGE_HOURS: Record<Exclude<RangePreset, "all">, number> = {
  "24h": 24,
  "7d":  24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

const RANGE_LABEL: Record<RangePreset, string> = {
  "24h": "24h", "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", "all": "Tudo",
};

const BUCKET_LABEL: Record<BucketType, string> = {
  hour: "Por hora", day: "Por dia", week: "Por semana", month: "Por mês",
};

export function AdminMetrics() {
  const [range, setRange] = useState<RangePreset>("30d");
  const [bucket, setBucket] = useState<BucketType>(DEFAULT_BUCKET["30d"]);
  const [growth, setGrowth] = useState<Row[]>([]);
  const [engagement, setEngagement] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersionRef = useRef(0);

  // When range changes, reset bucket to its default.
  useEffect(() => {
    setBucket(DEFAULT_BUCKET[range]);
  }, [range]);

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
      {/* Range pill bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
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

      {/* Bucket pill bar (hidden when only one option) */}
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

      <MetricChart title="Crescimento" data={growth} bucket={bucket} loading={loading} />
      <MetricChart title="Engajamento" data={engagement} bucket={bucket} loading={loading} />
    </div>
  );
}
```

### `app/admin/(dashboard)/metric-chart.tsx` (new, client component)

Componente apresentacional puro. Recebe `title`, `data`, `bucket`, `loading` e renderiza o `ComposedChart`.

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
  hour: "hora", day: "dia", week: "semana", month: "mês",
};

function formatBucket(iso: string, bucket: BucketType): string {
  const d = new Date(iso);
  if (bucket === "hour") {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
  const isEmpty = !loading && data.length > 0 && data.every((r) => r.new_count === 0);
  const isNoData = !loading && data.length === 0;
  const showEmptyState = isEmpty || isNoData;

  const chartData = data.map((r) => ({ ...r, label: formatBucket(r.bucket, bucket) }));

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      {showEmptyState ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          Sem dados nesse período.
        </div>
      ) : (
        <div className={`h-60 sm:h-80 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0a3d2a", border: "1px solid #155236" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: number, name) =>
                  name === "new_count"
                    ? [value, `Novos por ${BUCKET_LABEL[bucket]}`]
                    : [value, "Acumulado"]
                }
              />
              <Bar dataKey="new_count" fill="#2d7d4f" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke="#fbbf24" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

## Tratamento de erros

| Caso | Comportamento |
|---|---|
| RPC retorna erro (rede / permissão / SQL) | Trata como `data = []` → empty state nos charts. Log no console. Sem toast. |
| Base vazia (sem usuários ou user_stickers) | RPC retorna 0 linhas → empty state. |
| Filtro mudado durante fetch em voo | `fetchVersionRef` invalida o resultado antigo, evita race. |
| Granularidade trocada com preset incompatível | Não acontece — quando `range` muda, `bucket` é resetado pro `DEFAULT_BUCKET[range]`. |

## Edge cases

| Caso | Comportamento |
|---|---|
| Preset "Tudo" com base vazia | `MIN(created_at)` retorna NULL → RPC retorna 0 linhas → empty state. |
| Bucket "hour" em 7d (168 pontos) | Eixo X fica denso mas legível; tick auto pelo recharts. |
| Bucket "week" em 7d | Não disponível em `BUCKET_OPTIONS["7d"]` — UI não oferece. |
| Acumulado começa em > 0 no primeiro bucket | Comportamento esperado — `baseline` soma tudo antes do range. |
| User troca rapidamente entre presets | Cada troca cria nova `fetchVersionRef.current`, fetches antigos são descartados. |

## Fora de escopo

- Rankings (top stickers coletadas, mais raras, top grupos completos).
- Métricas sociais (amizades por período, mensagens de troca, usuários mais ativos).
- Tracking real de figurinhas trocadas — entra quando o fluxo de propor troca for implementado (ver spec do trade filter `2026-05-15-public-profile-trade-filter-design.md`).
- Filtro de data customizado (de/até) — só presets fixos nesta rodada.
- Filtro por grupo, time ou tipo de figurinha.
- Export dos charts (PNG / CSV).
- Granularidade independente entre Crescimento e Engajamento — uma única seleção global afeta os dois.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/027_admin_metrics_rpcs.sql` | Novo. Duas RPCs (`get_admin_growth`, `get_admin_engagement`) com `is_admin` gate. |
| `app/admin/(dashboard)/page.tsx` | Modify. Drop counts não usadas, reduz pra 3 KPI cards com "Em breve" badge, monta `<AdminMetrics />`. |
| `app/admin/(dashboard)/admin-metrics.tsx` | Novo. Client component com estado de filtro + granularidade, fetch das RPCs. |
| `app/admin/(dashboard)/metric-chart.tsx` | Novo. Client component apresentacional, renderiza `ComposedChart` com formatação de eixo X por granularidade. |
