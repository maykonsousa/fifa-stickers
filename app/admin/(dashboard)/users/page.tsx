import { createClient } from "@/lib/supabase/server";
import { UsersAdmin } from "./users-admin";

const PAGE_SIZE = 20;

type SortField = "created_at" | "display_name" | "sticker_count";
type SortDir = "asc" | "desc";

interface Props {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const sort: SortField = (["created_at", "display_name", "sticker_count"].includes(params.sort ?? "") ? params.sort : "created_at") as SortField;
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const total = totalCount ?? 0;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city, state, created_at, username, sticker_count")
    .order(sort, { ascending: dir === "asc" })
    .range(from, to);

  const { data: admins } = await supabase
    .from("admins")
    .select("user_id");

  const adminUserIds = admins?.map((a) => a.user_id) ?? [];

  return (
    <UsersAdmin
      profiles={profiles ?? []}
      adminUserIds={adminUserIds}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      sort={sort}
      dir={dir}
    />
  );
}
