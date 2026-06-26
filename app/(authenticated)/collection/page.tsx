import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlbumContext } from "@/lib/albums/get-active-album";
import { CollectionView } from "./collection-view";

export default async function CollectionPage() {
  const ctx = await getAlbumContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  return (
    <CollectionView
      groups={groups ?? []}
      userId={ctx.userId}
      albumId={ctx.activeAlbumId}
    />
  );
}
