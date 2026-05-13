"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Trophy, Layers, CheckCircle2, Plus, Share2, Check } from "lucide-react";

interface GroupData {
  id: number;
  name: string;
  code: string;
  type: string;
  sticker_count: number;
  owned: number;
  percent: number;
}

interface DashboardProps {
  totalOwned: number;
  totalStickers: number;
  totalRepeats: number;
  totalPercent: number;
  completedGroups: number;
  totalGroups: number;
  groups: GroupData[];
  username: string;
}

const COLORS = {
  field: "#0a3d2a",
  field2: "#155236",
  gold: "#fbbf24",
  gold2: "#f59e0b",
  emerald: "#10b981",
  cream: "#fef9e8",
};

export function DashboardCharts({
  totalOwned,
  totalStickers,
  totalRepeats,
  totalPercent,
  completedGroups,
  totalGroups,
  groups,
  username,
}: DashboardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = `https://faltauma.com/p/${username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { icon: Trophy, label: "Figurinhas", value: `${totalOwned}/${totalStickers}`, color: "text-yellow-400" },
    { icon: Layers, label: "Repetidas", value: `${totalRepeats}`, color: "text-orange-400" },
    { icon: CheckCircle2, label: "Completos", value: `${completedGroups}/${totalGroups}`, color: "text-cyan-400" },
  ];

  const pieData = [
    { name: "Coladas", value: totalOwned },
    { name: "Faltam", value: totalStickers - totalOwned },
  ];

  const teams = groups.filter((g) => g.type === "team");
  const specials = groups.filter((g) => g.type === "fwc" || g.type === "sponsor");

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0a3d2a] to-[#155236] p-5 md:p-8 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <h1
              className="text-xl sm:text-2xl md:text-3xl text-white"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
            >
              Meu Álbum
            </h1>
            <span
              className="text-xs text-[#fef9e8]/50 mt-1"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}
            >
              2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', fontSize: 11, letterSpacing: 0.5 }}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? "COPIADO" : "COMPARTILHAR"}
            </button>
            <Link
              href="/collection"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-yellow-400 text-zinc-900 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-colors"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', fontSize: 11, letterSpacing: 0.5 }}
            >
              <Plus className="w-4 h-4" />
              ADICIONAR
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_200px] gap-6 items-center">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} mb-1 sm:mb-2`} />
                <div
                  className="text-base sm:text-xl md:text-2xl text-white"
                  style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}
                >
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs text-[#fef9e8]/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Donut chart */}
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  animationBegin={200}
                  animationDuration={1000}
                >
                  <Cell fill={COLORS.gold} />
                  <Cell fill="rgba(255,255,255,0.1)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-2xl text-white"
                style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}
              >
                {totalPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Special groups */}
      {specials.length > 0 && (
        <section>
          <h2
            className="text-lg text-white mb-4"
            style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.3px' }}
          >
            Especiais
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {specials.map((group) => (
              <Link key={group.id} href={`/collection?group=${group.code}`} className="block">
                <GroupDonut group={group} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Teams grid */}
      <section>
        <h2
          className="text-lg text-white mb-4"
          style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.3px' }}
        >
          Seleções
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {teams.map((group) => (
            <Link key={group.id} href={`/collection?group=${group.code}`} className="block">
              <GroupDonut group={group} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const FLAG_MAP: Record<string, string> = {
  BRA: "🇧🇷", ARG: "🇦🇷", FRA: "🇫🇷", ESP: "🇪🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", GER: "🇩🇪",
  POR: "🇵🇹", NED: "🇳🇱", CRO: "🇭🇷", URU: "🇺🇾", COL: "🇨🇴", MEX: "🇲🇽",
  USA: "🇺🇸", JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", MAR: "🇲🇦", SEN: "🇸🇳",
  GHA: "🇬🇭", CAN: "🇨🇦", ECU: "🇪🇨", NOR: "🇳🇴", SWE: "🇸🇪", SUI: "🇨🇭",
  BEL: "🇧🇪", TUR: "🇹🇷", AUT: "🇦🇹", CZE: "🇨🇿", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", TUN: "🇹🇳",
  EGY: "🇪🇬", ALG: "🇩🇿", RSA: "🇿🇦", IRN: "🇮🇷", IRQ: "🇮🇶", QAT: "🇶🇦",
  KSA: "🇸🇦", JOR: "🇯🇴", UZB: "🇺🇿", NZL: "🇳🇿", PAN: "🇵🇦", PAR: "🇵🇾",
  HAI: "🇭🇹", CIV: "🇨🇮", CPV: "🇨🇻", CUW: "🇨🇼", COD: "🇨🇩", BIH: "🇧🇦",
  FWC: "🏆", CC: "🥤",
};

function GroupDonut({ group }: { group: GroupData }) {
  const isComplete = group.owned >= group.sticker_count;
  const flag = FLAG_MAP[group.code] ?? "⚽";
  const data = [
    { value: group.owned },
    { value: group.sticker_count - group.owned },
  ];

  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center transition-all cursor-pointer hover:scale-[1.03] hover:shadow-lg ${
      isComplete
        ? "border-yellow-400/30 bg-yellow-400/5 hover:border-yellow-400/50"
        : "border-white/10 bg-white/5 hover:border-white/20"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{flag}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            isComplete ? "bg-yellow-400/20 text-yellow-400" : "bg-white/10 text-white/60"
          }`}
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 1 }}
        >
          {group.code}
        </span>
      </div>
      <p className="text-xs font-medium text-white truncate w-full text-center mb-2">{group.name}</p>

      <div className="relative w-20 h-20">
        <PieChart width={80} height={80}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={36}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            animationBegin={100}
            animationDuration={800}
            stroke="none"
          >
            <Cell fill={isComplete ? COLORS.gold : COLORS.emerald} />
            <Cell fill="rgba(255,255,255,0.08)" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{group.percent}%</span>
        </div>
      </div>

      <span className="text-[10px] text-white/40 mt-1">{group.owned}/{group.sticker_count}</span>
    </div>
  );
}
