import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScannedSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

// Resolve uma figurinha pelo código já com a contagem de cópias do usuário, via a
// RPC lookup_sticker_by_code (uma query só — ver migration 064). A RPC retorna uma
// tabela de 0 ou 1 linha; pegamos a primeira.
export async function lookupStickerByCode(
  supabase: SupabaseClient,
  code: string,
  userId: string,
): Promise<ScannedSticker | null> {
  const { data, error } = await supabase.rpc("lookup_sticker_by_code", {
    p_code: code,
    p_user_id: userId,
  });

  if (error) return null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    image_url: row.image_url,
    owned_count: row.owned_count ?? 0,
  };
}
