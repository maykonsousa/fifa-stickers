import { createClient } from "@/lib/supabase/server";
import { CollectionView } from "./collection-view";

export default async function CollectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: groups }, { data: admin }] = await Promise.all([
    supabase
      .from("sticker_groups")
      .select("id, name, code, type, sticker_count")
      .order("id"),
    supabase
      .from("admins")
      .select("id")
      .eq("user_id", user!.id)
      .single(),
  ]);

  return (
    <CollectionView
      groups={groups ?? []}
      userId={user!.id}
      isAdmin={!!admin}
    />
  );
}
