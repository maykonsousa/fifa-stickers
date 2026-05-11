import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, stickers(group_id)")
    .eq("user_id", user!.id);

  const ownedByGroup = new Map<number, number>();
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
  const totalPercent = totalStickers > 0 ? Math.round((totalOwned / totalStickers) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Hero card */}
      <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Meu Álbum</h1>
        <div className="mt-4 flex items-end gap-4">
          <span className="text-5xl font-bold">{totalPercent}%</span>
          <span className="pb-1 text-green-100">
            {totalOwned} de {totalStickers} figurinhas
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-green-800/30">
          <div
            className="h-full rounded-full bg-white/90 transition-all"
            style={{ width: `${totalPercent}%` }}
          />
        </div>
      </div>

      {/* Groups grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Progresso por grupo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => {
            const owned = ownedByGroup.get(group.id) ?? 0;
            const percent = group.sticker_count > 0
              ? Math.round((owned / group.sticker_count) * 100)
              : 0;
            return (
              <div
                key={group.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">
                  {group.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{group.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {owned}/{group.sticker_count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
