"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Plus, Check, BookCopy } from "lucide-react";
import { validateAlbumName } from "@/lib/albums/album-rules";

type Album = { id: number; name: string };

export function AlbumSelector() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles").select("active_album_id").eq("id", user.id).single();
    const { data: rows } = await supabase
      .from("albums").select("id, name").eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAlbums((rows ?? []) as Album[]);
    setActiveId(profile?.active_album_id ?? (rows?.[0]?.id ?? null));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function selectAlbum(id: number) {
    if (id === activeId) { setOpen(false); return; }
    const supabase = createClient();
    await supabase.rpc("set_active_album", { p_album_id: id });
    setActiveId(id);
    setOpen(false);
    router.refresh();
  }

  async function handleCreate() {
    const check = validateAlbumName(newName, albums.map((a) => a.name));
    if (!check.ok) { setError(check.error); return; }
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("create_album", { p_name: newName.trim() });
    if (rpcErr) { setError("Não foi possível criar o álbum."); return; }
    const created = data as Album;
    await supabase.rpc("set_active_album", { p_album_id: created.id });
    setCreating(false);
    setNewName("");
    setError(null);
    await load();
    router.refresh();
  }

  const activeName = albums.find((a) => a.id === activeId)?.name ?? "Álbum";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors max-w-[180px]"
        aria-label="Selecionar álbum"
      >
        <BookCopy className="h-4 w-4 shrink-0" />
        <span className="truncate">{activeName}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
          <div className="py-1 max-h-72 overflow-y-auto">
            {albums.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAlbum(a.id)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="truncate">{a.name}</span>
                {a.id === activeId && <Check className="h-4 w-4 text-green-400 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 p-2">
            {creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setError(null); }}
                  placeholder="Nome do álbum"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500">Criar</button>
                  <button onClick={() => { setCreating(false); setError(null); setNewName(""); }} className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-2 py-2 text-sm text-green-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> Criar álbum
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
