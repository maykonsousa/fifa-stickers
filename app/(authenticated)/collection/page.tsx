import { createClient } from "@/lib/supabase/server";
import { CollectionView } from "./collection-view";

export default async function CollectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  return (
    <CollectionView
      groups={groups ?? []}
      userId={user!.id}
    />
  );
}
