import { getGroupEmoji } from "./sticker-group-emojis";

export type ShareKind = "missing" | "duplicates";

export interface ShareStickerItem {
  code: string;
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

const SEPARATOR = "─────────────";

const HEADER_LABEL: Record<ShareKind, string> = {
  missing: "📋 Faltam",
  duplicates: "📦 Repetidas",
};

export function formatShareList(input: FormatShareListInput): string {
  const lines: string[] = [];

  lines.push(`🏆 *faltaUma* — álbum do @${input.username}`);
  lines.push(`👤 ${input.displayName}`);
  lines.push("");
  lines.push(`${HEADER_LABEL[input.kind]} (${input.totalCount}):`);
  lines.push(SEPARATOR);
  lines.push("");

  for (const group of input.groups) {
    if (group.stickers.length === 0) continue;
    const emoji = getGroupEmoji(group.code);
    lines.push(`*${emoji} ${group.name}* (${group.code})`);
    lines.push(
      group.stickers
        .map((sticker) =>
          sticker.count >= 3 ? `${sticker.code} ×${sticker.count}` : sticker.code
        )
        .join(", ")
    );
    lines.push("");
  }

  lines.push(SEPARATOR);
  lines.push("💬 Bora trocar? 🤝");
  lines.push(`🔗 ${input.profileUrl}`);

  return lines.join("\n");
}
