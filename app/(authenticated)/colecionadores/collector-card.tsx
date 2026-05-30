import Link from "next/link";
import Image from "next/image";

export interface CollectorCardProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  matchCount: number;
  previewStickers: { id: number; imageUrl: string | null }[];
}

export function CollectorCard({
  username,
  displayName,
  avatarUrl,
  city,
  state,
  matchCount,
  previewStickers,
}: CollectorCardProps) {
  const location = [city, state].filter(Boolean).join(", ");
  const extra = matchCount - previewStickers.length;

  return (
    <Link
      href={`/p/${username}`}
      aria-label={`Ver perfil de ${displayName}, ${matchCount} figurinha${matchCount === 1 ? "" : "s"} em comum`}
      className="block rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:border-green-500/40 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar url={avatarUrl} name={displayName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          {location && <p className="text-xs text-gray-400 truncate">{location}</p>}
          <p className="mt-1 text-xs text-green-400 font-medium">
            {matchCount} figurinha{matchCount === 1 ? "" : "s"} que você precisa
          </p>
        </div>
      </div>

      {previewStickers.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {previewStickers.map((s) => (
            <div
              key={s.id}
              className="relative h-12 w-12 rounded-md overflow-hidden bg-white/5 border border-white/10 flex-shrink-0"
            >
              {s.imageUrl ? (
                <Image src={s.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          ))}
          {extra > 0 && (
            <span className="text-xs text-gray-400 font-medium">+{extra}</span>
          )}
        </div>
      )}
    </Link>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={url} alt={name} className="h-10 w-10 rounded-full flex-shrink-0" />;
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
