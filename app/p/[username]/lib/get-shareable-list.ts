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

  const [
    { data: userStickers, error: userStickersErr },
    { data: allStickers, error: allStickersErr },
  ] = await Promise.all([
    supabase.from("user_stickers").select("sticker_id").eq("user_id", profile.id),
    supabase
      .from("stickers")
      .select("id, code, number, title, group_id, sticker_groups(id, name, code)")
      .order("group_id", { ascending: true })
      .order("number", { ascending: true }),
  ]);

  if (userStickersErr || allStickersErr) {
    return { ok: false, error: "Erro ao carregar figurinhas" };
  }

  // Owner sticker_id → count
  const ownedCounts = new Map<number, number>();
  for (const us of userStickers ?? []) {
    ownedCounts.set(us.sticker_id, (ownedCounts.get(us.sticker_id) ?? 0) + 1);
  }

  // Filter by kind
  type StickerRow = {
    id: number;
    code: string;
    number: number;
    title: string | null;
    group_id: number;
    sticker_groups: { id: number; name: string; code: string } | null;
  };

  const rows = (allStickers ?? []) as unknown as StickerRow[];

  const filtered = rows.filter((s) => {
    const owned = ownedCounts.get(s.id) ?? 0;
    return params.kind === "missing" ? owned === 0 : owned >= 2;
  });

  // Group by sticker_groups.id, preserving order (already sorted)
  const groupsMap = new Map<number, ShareStickerGroup>();
  for (const row of filtered) {
    const g = row.sticker_groups;
    if (!g) continue;
    let bucket = groupsMap.get(g.id);
    if (!bucket) {
      bucket = { name: g.name, code: g.code, stickers: [] };
      groupsMap.set(g.id, bucket);
    }
    bucket.stickers.push({ code: row.code, title: row.title });
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
