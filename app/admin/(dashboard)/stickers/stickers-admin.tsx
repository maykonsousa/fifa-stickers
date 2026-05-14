"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PaginationControl } from "@/components/ui/pagination";
import { CreateStickerModal } from "./create-sticker-modal";

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
  description: string | null;
  image_url: string | null;
}

export function StickersAdmin({
  groups,
  stickers,
  userId,
}: {
  groups: Group[];
  stickers: Sticker[];
  userId: string;
}) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filteredStickers = selectedGroup
    ? stickers.filter((s) => s.group_id === selectedGroup)
    : stickers;

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(filteredStickers.length / PAGE_SIZE);
  const paginatedStickers = filteredStickers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (sticker: Sticker) => {
    setEditingSticker(sticker);
    setEditTitle(sticker.title ?? "");
    setEditDescription(sticker.description ?? "");
    setImageFile(null);
    setImagePreview(sticker.image_url);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
    setEditingSticker(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!editingSticker) return;
    setSaving(true);
    const supabase = createClient();

    let imageUrl = editingSticker.image_url;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `stickers/${editingSticker.code}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("sticker-images")
        .upload(path, imageFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("sticker-images")
          .getPublicUrl(path);
        imageUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      }
    }

    await supabase
      .from("stickers")
      .update({
        title: editTitle || null,
        description: editDescription || null,
        image_url: imageUrl,
      })
      .eq("id", editingSticker.id);

    setSaving(false);
    handleClose();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Figurinhas</h1>
        <span className="text-sm text-gray-400">{filteredStickers.length} figurinhas</span>
      </div>

      {/* Group filter */}
      <Popover open={groupOpen} onOpenChange={setGroupOpen}>
        <PopoverTrigger
          className="flex w-full sm:w-52 items-center justify-between rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
        >
          <span className={selectedGroup ? "text-white" : "text-gray-400"}>
            {selectedGroup
              ? groups.find((g) => g.id === selectedGroup)?.name ?? "Grupo"
              : "Todos os grupos"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}>
            <CommandInput placeholder="Buscar grupo..." />
            <CommandList>
              <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setSelectedGroup(null);
                    setPage(1);
                    setGroupOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${selectedGroup === null ? "opacity-100" : "opacity-0"}`} />
                  Todos os grupos
                </CommandItem>
                {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                  <CommandItem
                    key={g.id}
                    value={`${g.code} ${g.name}`}
                    onSelect={() => {
                      setSelectedGroup(g.id);
                      setPage(1);
                      setGroupOpen(false);
                    }}
                  >
                    <Check className={`mr-2 h-4 w-4 ${selectedGroup === g.id ? "opacity-100" : "opacity-0"}`} />
                    {g.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Stickers grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {page === 1 && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group flex aspect-[2/3] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-white/60 hover:border-green-500/60 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Adicionar figurinha"
          >
            <span className="text-4xl leading-none">+</span>
            <span className="mt-2 text-xs font-medium">Adicionar</span>
          </button>
        )}
        {paginatedStickers.map((sticker) => (
          <div
            key={sticker.id}
            onClick={() => handleEdit(sticker)}
            className="group relative cursor-pointer rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:scale-[1.03] hover:border-white/20 transition-all"
          >
            <div className="aspect-[2/3] relative">
              {sticker.image_url ? (
                <img
                  src={sticker.image_url}
                  alt={sticker.code}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gray-800/50">
                  <svg className="h-12 w-12 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
              )}

              {/* Player name overlay on hover */}
              {sticker.image_url && sticker.title && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-sm font-bold text-white text-center px-2 leading-tight">
                    {sticker.title}
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                <span className="text-[10px] font-bold text-white">{sticker.code}</span>
                {sticker.title && !sticker.image_url && (
                  <span className="block text-[10px] text-white/70 truncate">{sticker.title}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <PaginationControl
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <CreateStickerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        groups={groups}
        existingStickers={stickers}
        defaultGroupId={selectedGroup}
        onSubmit={async () => {
          // Wired up in Task 5.
          return { ok: false, message: "Em construção" };
        }}
      />

      {/* Edit Dialog */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto w-full max-w-md rounded-xl bg-gray-800 p-0 text-white backdrop:bg-black/60"
        onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
      >
        {editingSticker && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Editar {editingSticker.code}
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-white text-xl">
                ×
              </button>
            </div>

            {/* Image preview */}
            <div className="flex flex-col items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={editingSticker.code}
                  className="h-40 w-28 rounded-lg object-cover border border-gray-600"
                />
              ) : (
                <div className="flex h-40 w-28 items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-700/50">
                  <span className="text-xs text-gray-500">Sem imagem</span>
                </div>
              )}
              <label className="cursor-pointer rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600 transition-colors">
                Escolher imagem
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300">Título</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Nome do jogador, estádio, etc."
                  className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Descrição</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descrição opcional"
                  className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
