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
  const isInitialLoad = loading && data.length === 0;
  const showEmptyState = !loading && data.every((r) => r.new_count === 0);

  const chartData = data.map((r) => ({
    ...r,
    label: formatBucket(r.bucket, bucket),
  }));

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      {isInitialLoad ? (
        <div className="h-60 sm:h-80 rounded bg-white/5 animate-pulse" />
      ) : showEmptyState ? (
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
