export interface NavSticker {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  orientation: "portrait" | "landscape";
  owned_count: number;
  wishlisted: boolean;
}

interface ListRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  owned_count: number;
  wishlisted: boolean;
}

interface AlbumRow {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
  orientation: "portrait" | "landscape";
  row: number;
  col: number;
  viewer_owned_count: number;
}

interface AlbumPageLike {
  page: number;
  stickers: AlbumRow[];
}

export type NextAction =
  | { type: "move"; index: number }
  | { type: "loadMore" }
  | { type: "none" };

export function listToNavList(rows: ListRow[]): NavSticker[] {
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    image_url: r.image_url,
    orientation: "portrait",
    owned_count: r.owned_count,
    wishlisted: r.wishlisted,
  }));
}

export function albumToNavList(
  pages: AlbumPageLike[],
  wishlistedIds: Set<number>,
): NavSticker[] {
  const orderedPages = [...pages].sort((a, b) => a.page - b.page);
  const out: NavSticker[] = [];
  for (const p of orderedPages) {
    const stickers = [...p.stickers].sort(
      (a, b) => a.row - b.row || a.col - b.col,
    );
    for (const s of stickers) {
      out.push({
        id: s.id,
        code: s.code,
        title: s.title,
        image_url: s.image_url,
        orientation: s.orientation,
        owned_count: s.viewer_owned_count,
        wishlisted: wishlistedIds.has(s.id),
      });
    }
  }
  return out;
}

export function canGoPrev(index: number): boolean {
  return index > 0;
}

export function canGoNext(
  index: number,
  length: number,
  hasMore: boolean,
): boolean {
  return index < length - 1 || hasMore;
}

export function resolveNext(
  index: number,
  length: number,
  hasMore: boolean,
): NextAction {
  if (index < length - 1) return { type: "move", index: index + 1 };
  if (hasMore) return { type: "loadMore" };
  return { type: "none" };
}
