import Link from "next/link";
import { Mailbox, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardCharts } from "@/components/dashboard-charts";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user!.id)
    .single();

  const { count: pendingProposalsCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", user!.id)
    .eq("status", "pending");
  const pendingCount = pendingProposalsCount ?? 0;

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  const { data: groupCounts } = await supabase
    .rpc("get_user_group_counts", { p_user_id: user!.id });

  const ownedByGroup = new Map<number, number>();
  let totalEntries = 0;

  for (const row of (groupCounts ?? []) as Array<{ group_id: number; owned: number; total_entries: number }>) {
    ownedByGroup.set(row.group_id, row.owned);
    totalEntries += row.total_entries;
  }

  const totalStickers = groups?.reduce((sum, g) => sum + g.sticker_count, 0) ?? 0;
  const totalOwned = Array.from(ownedByGroup.values()).reduce((sum, v) => sum + v, 0);
  const totalRepeats = totalEntries - totalOwned;
  const totalPercent = totalStickers > 0 ? Math.round((totalOwned / totalStickers) * 100) : 0;
  const completedGroups = groups?.filter(g => (ownedByGroup.get(g.id) ?? 0) >= g.sticker_count).length ?? 0;

  const groupsData = (groups ?? []).map(g => ({
    id: g.id,
    name: g.name,
    code: g.code,
    type: g.type,
    sticker_count: g.sticker_count,
    owned: ownedByGroup.get(g.id) ?? 0,
    percent: g.sticker_count > 0 ? Math.round(((ownedByGroup.get(g.id) ?? 0) / g.sticker_count) * 100) : 0,
  }));

  return (
    <>
      {pendingCount > 0 && (
        <Link
          href="/proposals?tab=received"
          className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 flex-shrink-0">
            <Mailbox className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {pendingCount === 1
                ? "Você tem 1 proposta pendente"
                : `Você tem ${pendingCount} propostas pendentes`}
            </p>
            <p className="text-xs text-amber-200/80">
              {pendingCount === 1
                ? "Alguém quer trocar figurinhas com você."
                : "Pessoas querem trocar figurinhas com você."}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
        </Link>
      )}
      <DashboardCharts
        totalOwned={totalOwned}
        totalStickers={totalStickers}
        totalRepeats={totalRepeats}
        totalPercent={totalPercent}
        completedGroups={completedGroups}
        totalGroups={groups?.length ?? 0}
        groups={groupsData}
        username={profile?.username ?? ""}
      />
    </>
  );
}
