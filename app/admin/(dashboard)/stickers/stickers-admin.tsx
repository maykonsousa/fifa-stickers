"use client";

import { useState, useRef } from "react";
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
  description: string | null;
  image_url: string | null;
}

export function StickersAdmin({ groups, stickers }: { groups: Group[]; stickers: Sticker[] }) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filteredStickers = selectedGroup
    ? stickers.filter((s) => s.group_id === selectedGroup)
    : stickers;

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
        imageUrl = urlData.publicUrl;
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
      <select
        value={selectedGroup ?? ""}
        onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
        className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
      >
        <option value="">Todos os grupos</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
        ))}
      </select>

      {/* Stickers table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Imagem</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredStickers.map((sticker) => (
              <tr key={sticker.id} className="bg-gray-800/50 hover:bg-gray-700/50">
                <td className="px-4 py-2 font-mono text-white">{sticker.code}</td>
                <td className="px-4 py-2 text-gray-400">{sticker.number}</td>
                <td className="px-4 py-2">
                  <span className={sticker.title ? "text-white" : "text-gray-500 italic"}>
                    {sticker.title ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {sticker.image_url ? (
                    <img src={sticker.image_url} alt={sticker.code} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleEdit(sticker)}
                    className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
