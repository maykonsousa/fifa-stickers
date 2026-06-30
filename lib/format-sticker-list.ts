import { getGroupEmoji } from "./sticker-group-emojis";
import { getAlbumOrderIndex } from "./album-team-order";

export type ShareKind = "missing" | "duplicates";

export interface ShareStickerItem {
  code: string;
  number: number;
  title: string | null;
  count: number;
}

export interface ShareStickerGroup {
  name: string;
  code: string;
  stickers: ShareStickerItem[];
}

export interface FormatShareListInput {
  kind: ShareKind;
  displayName: string;
  username: string;
  totalCount: number;
  groups: ShareStickerGroup[];
  profileUrl: string;
}

export function formatShareList(input: FormatShareListInput): string {
  const lines: string[] = [];

  // Sort groups: FWC first, then by album order
  const sortedGroups = [...input.groups].sort((a, b) => {
    if (a.code === "FWC") return -1;
    if (b.code === "FWC") return 1;
    return getAlbumOrderIndex(a.code) - getAlbumOrderIndex(b.code);
  });

  for (const group of sortedGroups) {
    if (group.stickers.length === 0) continue;
    const emoji = getGroupEmoji(group.code);
    // Sort stickers by number numerically
    const sortedStickers = [...group.stickers].sort((a, b) => a.number - b.number);
    const stickerNumbers = sortedStickers
      .map((sticker) => String(sticker.number))
      .join(", ");
    lines.push(`${group.code} ${emoji}: ${stickerNumbers}`);
  }

  if (lines.length === 0) {
    const emptyMessage = input.kind === "duplicates" ? "Nenhuma repetida" : "Nenhuma faltante";
    lines.push(emptyMessage);
  }

  lines.push("");
  lines.push("Falta alguma? Me mande sua lista! 🔄");
  lines.push(input.profileUrl);

  return lines.join("\n");
}
