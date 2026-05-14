import { createClient } from "@/lib/supabase/server";
import { UsersAdmin } from "./users-admin";

const PAGE_SIZE = 20;

type SortField = "created_at" | "display_name" | "stickers";
type SortDir = "asc" | "desc";

interface Props {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const sort: SortField = (["created_at", "display_name", "stickers"].includes(params.sort ?? "") ? params.sort : "created_at") as SortField;
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const total = totalCount ?? 0;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city, state, created_at, username");

  if (sort !== "stickers") {
    query = query.order(sort, { ascending: dir === "asc" });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: profiles } = await query.range(from, to);

  const userIds = profiles?.map((p) => p.id) ?? [];
  let stickerCounts: Record<string, number> = {};

  if (userIds.length > 0) {
    const { data: stickers } = await supabase
      .from("user_stickers")
      .select("user_id, sticker_id")
      .in("user_id", userIds);

    if (stickers) {
      const countMap: Record<string, Set<string>> = {};
      for (const s of stickers) {
        if (!countMap[s.user_id]) countMap[s.user_id] = new Set();
        countMap[s.user_id].add(s.sticker_id);
      }
      for (const [uid, set] of Object.entries(countMap)) {
        stickerCounts[uid] = set.size;
      }
    }
  }

  const { data: admins } = await supabase
    .from("admins")
    .select("user_id");

  const adminUserIds = admins?.map((a) => a.user_id) ?? [];

  let profilesWithStickers = (profiles ?? []).map((p) => ({
    ...p,
    sticker_count: stickerCounts[p.id] ?? 0,
  }));

  if (sort === "stickers") {
    profilesWithStickers.sort((a, b) =>
      dir === "asc" ? a.sticker_count - b.sticker_count : b.sticker_count - a.sticker_count
    );
  }

  return (
    <UsersAdmin
      profiles={profilesWithStickers}
      adminUserIds={adminUserIds}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      sort={sort}
      dir={dir}
    />
  );
}
