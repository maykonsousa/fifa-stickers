import { createClient } from "@/lib/supabase/server";
import { CollectionView } from "./collection-view";

export default async function CollectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, group_id, code, number, title")
    .order("group_id")
    .order("number");

  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("id, sticker_id")
    .eq("user_id", user!.id);

  return (
    <CollectionView
      groups={groups ?? []}
      stickers={stickers ?? []}
      userStickers={userStickers ?? []}
      userId={user!.id}
    />
  );
}
