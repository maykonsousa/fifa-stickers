"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface CollectorsFiltersProps {
  groups: { id: number; name: string }[];
  viewerHasState: boolean;
}

export function CollectorsFilters({ groups, viewerHasState }: CollectorsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentGroup = searchParams.get("group") ?? "";
  const currentNearby = searchParams.get("nearby") === "true";

  const update = (next: { group?: string; nearby?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.group !== undefined) {
      if (next.group) params.set("group", next.group);
      else params.delete("group");
    }
    if (next.nearby !== undefined) {
      if (next.nearby) params.set("nearby", "true");
      else params.delete("nearby");
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`/players${params.toString() ? `?${params}` : ""}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Coleção:</span>
        <select
          aria-label="Filtrar por coleção"
          value={currentGroup}
          onChange={(e) => update({ group: e.target.value })}
          disabled={isPending}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          <option value="">Todas</option>
          {groups.map((g) => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
      </label>

      <label
        className={`flex items-center gap-2 text-sm ${viewerHasState ? "" : "opacity-50 cursor-not-allowed"}`}
        title={viewerHasState ? undefined : "Preencha sua cidade no perfil pra usar esse filtro"}
      >
        <input
          type="checkbox"
          aria-label="Só do meu estado"
          checked={currentNearby && viewerHasState}
          disabled={!viewerHasState || isPending}
          onChange={(e) => update({ nearby: e.target.checked })}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500"
        />
        <span className="text-gray-300">Só do meu estado</span>
      </label>
    </div>
  );
}
