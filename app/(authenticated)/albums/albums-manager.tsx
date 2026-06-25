"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Star, Check, Pencil, Trash2, Plus } from "lucide-react";
import { validateAlbumName, canDeleteAlbum } from "@/lib/albums/album-rules";

type Album = { id: number; name: string; sticker_count: number };

export function AlbumsManager({
  albums,
  activeAlbumId,
  publicAlbumId,
}: {
  albums: Album[];
  activeAlbumId: number;
  publicAlbumId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const names = albums.map((a) => a.name);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    await fn();
    setBusy(false);
    router.refresh();
  }

  async function handleCreate() {
    const check = validateAlbumName(newName, names);
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("create_album", { p_name: newName.trim() });
      setCreating(false);
      setNewName("");
    });
  }

  async function handleRename(id: number) {
    const check = validateAlbumName(editName, names.filter((n) => n !== albums.find((a) => a.id === id)?.name));
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("rename_album", { p_album_id: id, p_name: editName.trim() });
      setEditingId(null);
    });
  }

  async function handleDelete(id: number) {
    const check = canDeleteAlbum({ albumId: id, publicAlbumId, totalAlbums: albums.length });
    if (!check.ok) { setError(check.error); return; }
    await run(async () => {
      await supabase.rpc("delete_album", { p_album_id: id });
    });
  }

  async function makePublic(id: number) {
    await run(async () => { await supabase.rpc("set_public_album", { p_album_id: id }); });
  }

  async function makeActive(id: number) {
    await run(async () => { await supabase.rpc("set_active_album", { p_album_id: id }); });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="space-y-2">
        {albums.map((a) => (
          <li key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            {editingId === a.id ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                />
                <button disabled={busy} onClick={() => handleRename(a.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Salvar</button>
                <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm text-gray-400">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{a.name}</span>
                    {a.id === publicAlbumId && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400"><Star className="h-3 w-3" /> Público</span>}
                    {a.id === activeAlbumId && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400"><Check className="h-3 w-3" /> Ativo</span>}
                  </div>
                  <p className="text-xs text-gray-400">{a.sticker_count} figurinhas</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.id !== activeAlbumId && (
                    <button disabled={busy} onClick={() => makeActive(a.id)} className="rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Usar</button>
                  )}
                  {a.id !== publicAlbumId && (
                    <button disabled={busy} onClick={() => makePublic(a.id)} className="rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/5">Tornar público</button>
                  )}
                  <button onClick={() => { setEditingId(a.id); setEditName(a.name); setError(null); }} className="rounded-lg p-2 text-gray-400 hover:bg-white/5" aria-label="Renomear"><Pencil className="h-4 w-4" /></button>
                  <button disabled={busy} onClick={() => handleDelete(a.id)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(null); }}
            placeholder="Nome do novo álbum"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <div className="flex gap-2">
            <button disabled={busy} onClick={handleCreate} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Criar</button>
            <button onClick={() => { setCreating(false); setNewName(""); setError(null); }} className="rounded-lg px-3 py-1.5 text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
          <Plus className="h-4 w-4" /> Criar álbum
        </button>
      )}
    </div>
  );
}
