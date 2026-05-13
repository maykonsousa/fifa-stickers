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

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, stickers(group_id)")
    .eq("user_id", user!.id);

  const ownedByGroup = new Map<number, number>();
  const totalEntries = userStickers?.length ?? 0;

  if (userStickers) {
    const seen = new Set<string>();
    for (const us of userStickers) {
      const key = `${us.sticker_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        const groupId = (us.stickers as unknown as { group_id: number }).group_id;
        ownedByGroup.set(groupId, (ownedByGroup.get(groupId) ?? 0) + 1);
      }
    }
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
  );
}
