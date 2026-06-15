import { createClient } from "@/lib/supabase/server";
import { CollectorsFilters } from "./collectors-filters";
import { CollectorsList } from "./collectors-list";
import type { CollectorCardProps } from "./collector-card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function CollectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; nearby?: string; page?: string }>;
}) {
  const params = await searchParams;
  const groupId = params.group ? parseInt(params.group, 10) : null;
  const onlyNearby = params.nearby === "true";
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user!.id;

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("state")
    .eq("id", viewerId)
    .single();
  const viewerHasState = Boolean(viewerProfile?.state);

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name")
    .order("id");

  const { data: rpcRows, error } = await supabase.rpc("get_collector_matches", {
    p_viewer_id: viewerId,
    p_group_id: groupId,
    p_only_nearby: onlyNearby && viewerHasState,
    p_page: page,
    p_page_size: PAGE_SIZE,
  });

  if (error) {
    console.error("get_collector_matches failed", error);
  }

  const rows = (rpcRows ?? []) as Array<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    match_count: number;
    preview_sticker_ids: number[];
    total_count: number;
  }>;

  const totalCount = rows[0]?.total_count ?? 0;

  const allStickerIds = Array.from(new Set(rows.flatMap((r) => r.preview_sticker_ids ?? [])));
  const stickerMap = new Map<number, string | null>();
  if (allStickerIds.length > 0) {
    const { data: stickers } = await supabase
      .from("stickers")
      .select("id, image_url")
      .in("id", allStickerIds);
    for (const s of stickers ?? []) stickerMap.set(s.id, s.image_url);
  }

  const collectors: CollectorCardProps[] = rows.map((r) => ({
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    city: r.city,
    state: r.state,
    matchCount: r.match_count,
    previewStickers: (r.preview_sticker_ids ?? []).map((id) => ({
      id,
      imageUrl: stickerMap.get(id) ?? null,
    })),
  }));

  const hasFiltersApplied = Boolean(groupId) || (onlyNearby && viewerHasState);

  return (
    <div className="space-y-6">
      <CollectorsFilters groups={groups ?? []} viewerHasState={viewerHasState} />

      {collectors.length === 0 ? (
        <EmptyState hasFilters={hasFiltersApplied} />
      ) : (
        <CollectorsList
          collectors={collectors}
          totalCount={totalCount}
          page={page}
          pageSize={PAGE_SIZE}
          searchParams={{ group: params.group, nearby: params.nearby }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-gray-300">Nenhum colecionador com esses filtros.</p>
        <a href="/players" className="mt-3 inline-block text-sm text-green-400 hover:underline">
          Limpar filtros
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
      <p className="text-sm text-gray-300">
        Ninguém ainda tem o que você precisa. Volte mais tarde.
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Dica: complete sua coleção em <a href="/collection" className="text-green-400 hover:underline">/collection</a> pra que o ranking encontre matches melhores.
      </p>
    </div>
  );
}
