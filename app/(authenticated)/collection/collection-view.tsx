"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Group {
  id: number;
  name: string;
  code: string;
  type: string;
  sticker_count: number;
}

interface Sticker {
  id: number;
  group_id: number;
  code: string;
  number: number;
  title: string | null;
}

interface UserSticker {
  id: string;
  sticker_id: number;
}

export function CollectionView({
  groups,
  stickers,
  userStickers,
  userId,
}: {
  groups: Group[];
  stickers: Sticker[];
  userStickers: UserSticker[];
  userId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");

  const userStickerMap = new Map<number, string[]>();
  for (const us of userStickers) {
    const existing = userStickerMap.get(us.sticker_id) ?? [];
    existing.push(us.id);
    userStickerMap.set(us.sticker_id, existing);
  }

  const filteredStickers = stickers.filter((s) => {
    if (selectedGroup && s.group_id !== selectedGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.code.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleAdd = async (stickerId: number) => {
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").insert({ user_id: userId, sticker_id: stickerId });
    router.refresh();
    setAdding(false);
  };

  const handleRemove = async (stickerId: number) => {
    const ids = userStickerMap.get(stickerId);
    if (!ids || ids.length === 0) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("user_stickers").delete().eq("id", ids[ids.length - 1]);
    router.refresh();
    setAdding(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const code = quickAdd.trim().toUpperCase();
    const sticker = stickers.find((s) => s.code === code);
    if (!sticker) {
      alert(`Figurinha "${code}" não encontrada.`);
      return;
    }
    await handleAdd(sticker.id);
    setQuickAdd("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Coleção</h1>
        <p className="mt-1 text-sm text-gray-600">
          Adicione figurinhas digitando o código ou navegue pela lista.
        </p>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          type="text"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          placeholder="Digite o código (ex: BRA7)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Adicionar
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código ou nome..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <select
          value={selectedGroup ?? ""}
          onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        >
          <option value="">Todos os grupos</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {filteredStickers.map((sticker) => {
          const count = userStickerMap.get(sticker.id)?.length ?? 0;
          const hasIt = count > 0;
          const isDuplicate = count > 1;

          return (
            <div
              key={sticker.id}
              className={`relative flex flex-col items-center rounded-lg border p-2 text-center transition-colors ${
                hasIt
                  ? isDuplicate
                    ? "border-amber-300 bg-amber-50"
                    : "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="text-xs font-bold text-gray-700">{sticker.code}</span>
              {sticker.title && (
                <span className="mt-0.5 text-[10px] text-gray-500 truncate w-full">
                  {sticker.title}
                </span>
              )}
              {isDuplicate && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {count}
                </span>
              )}
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => handleAdd(sticker.id)}
                  disabled={adding}
                  className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                >
                  +
                </button>
                {hasIt && (
                  <button
                    onClick={() => handleRemove(sticker.id)}
                    disabled={adding}
                    className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    −
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
