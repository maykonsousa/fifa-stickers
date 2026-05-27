"use server";

import { createClient } from "@/lib/supabase/server";
import {
  formatShareList,
  type ShareKind,
  type ShareStickerGroup,
} from "@/lib/format-sticker-list";

export async function getShareableStickerList(params: {
  username: string;
  kind: ShareKind;
}): Promise<{ ok: true; text: string; count: number } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", params.username)
    .single();

  if (profileErr || !profile) {
    return { ok: false, error: "Perfil não encontrado" };
  }

  const { data: shareRows, error: shareErr } = await supabase
    .rpc("get_user_share_list", { p_user_id: profile.id, p_kind: params.kind })
    .range(0, 9999);

  if (shareErr) {
    return { ok: false, error: "Erro ao carregar figurinhas" };
  }

  type ShareRow = {
    group_id: number;
    group_name: string;
    group_code: string;
    sticker_id: number;
    sticker_code: string;
    sticker_number: number;
    sticker_title: string | null;
  };

  const groupsMap = new Map<number, ShareStickerGroup>();
  for (const row of (shareRows ?? []) as ShareRow[]) {
    let bucket = groupsMap.get(row.group_id);
    if (!bucket) {
      bucket = { name: row.group_name, code: row.group_code, stickers: [] };
      groupsMap.set(row.group_id, bucket);
    }
    bucket.stickers.push({ code: row.sticker_code, title: row.sticker_title });
  }

  const groups = Array.from(groupsMap.values());
  const totalCount = groups.reduce((sum, g) => sum + g.stickers.length, 0);

  if (totalCount === 0) {
    return { ok: false, error: params.kind === "missing" ? "Não faltam figurinhas" : "Sem repetidas" };
  }

  const text = formatShareList({
    kind: params.kind,
    displayName: profile.display_name,
    username: profile.username,
    totalCount,
    profileUrl: `https://faltauma.com/p/${profile.username}`,
    groups,
  });

  return { ok: true, text, count: totalCount };
}
