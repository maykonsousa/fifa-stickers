"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MetricChart } from "./metric-chart";

type RangePreset = "24h" | "7d" | "30d" | "90d" | "all";
type BucketType = "hour" | "day" | "week" | "month";

type Row = { bucket: string; new_count: number; cumulative: number };

type Kpi = {
  label: string;
  value: number | null;
  comingSoon?: boolean;
};

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

export function AdminMetrics({ kpis }: { kpis: Kpi[] }) {
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
    ])
      .then(([g, e]) => {
        if (myVersion !== fetchVersionRef.current) return;
        if (g.error || e.error) {
          console.error("[AdminMetrics] RPC error", {
            growthError: g.error,
            engagementError: e.error,
          });
        }
        setGrowth((g.data as Row[] | null) ?? []);
        setEngagement((e.data as Row[] | null) ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (myVersion !== fetchVersionRef.current) return;
        console.error("[AdminMetrics] RPC failure", err);
        setGrowth([]);
        setEngagement([]);
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

      {/* KPI cards (3, all-time) */}
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
