import Link from "next/link";
import { CollectorCard, type CollectorCardProps } from "./collector-card";

export interface CollectorsListProps {
  collectors: CollectorCardProps[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
}

export function CollectorsList({
  collectors,
  totalCount,
  page,
  pageSize,
  searchParams,
}: CollectorsListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.group) params.set("group", searchParams.group);
    if (searchParams.nearby) params.set("nearby", searchParams.nearby);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `/players${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {collectors.map((c) => (
          <CollectorCard key={c.username} {...c} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </span>
          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 ${
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Próxima →
          </Link>
        </div>
      )}
    </div>
  );
}
