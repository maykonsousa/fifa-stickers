import { createClient } from "@/lib/supabase/server";
import { UsersAdmin } from "./users-admin";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city, state, created_at, username")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: admins } = await supabase
    .from("admins")
    .select("user_id");

  const adminUserIds = admins?.map((a) => a.user_id) ?? [];

  return <UsersAdmin profiles={profiles ?? []} adminUserIds={adminUserIds} />;
}
