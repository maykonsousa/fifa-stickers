import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScannedSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

export async function lookupStickerByCode(
  supabase: SupabaseClient,
  code: string,
  userId: string,
): Promise<ScannedSticker | null> {
  const { data: sticker } = await supabase
    .from("stickers")
    .select("id, code, title, image_url")
    .eq("code", code)
    .maybeSingle();

  if (!sticker) return null;

  const { count } = await supabase
    .from("user_stickers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sticker_id", sticker.id);

  return {
    id: sticker.id,
    code: sticker.code,
    title: sticker.title,
    image_url: sticker.image_url,
    owned_count: count ?? 0,
  };
}
