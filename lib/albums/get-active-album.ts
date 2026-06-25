import { createClient } from "@/lib/supabase/server";

export type AlbumRow = { id: number; name: string; sticker_count: number };
export type AlbumContext = {
  userId: string;
  albums: AlbumRow[];
  activeAlbumId: number;
  publicAlbumId: number;
};

export async function getAlbumContext(): Promise<AlbumContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_album_id, public_album_id")
    .eq("id", user.id)
    .single();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, sticker_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const list = (albums ?? []) as AlbumRow[];
  const activeAlbumId = profile?.active_album_id ?? list[0]?.id;
  const publicAlbumId = profile?.public_album_id ?? list[0]?.id;
  if (!activeAlbumId) return null;

  return { userId: user.id, albums: list, activeAlbumId, publicAlbumId };
}
