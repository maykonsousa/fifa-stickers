"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
  share_instagram: boolean;
  share_whatsapp: boolean;
}

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = `faltauma.com/p/${profile?.username ?? ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${publicUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const username = (formData.get("username") as string).toLowerCase().replace(/[^a-z0-9]/g, "");

    if (username.length < 3) {
      toast.error("Username deve ter pelo menos 3 caracteres.");
      setSaving(false);
      return;
    }

    const updates = {
      display_name: formData.get("display_name") as string,
      username,
      city: formData.get("city") as string || null,
      state: formData.get("state") as string || null,
      instagram: formData.get("instagram") as string || null,
      whatsapp: formData.get("whatsapp") as string || null,
      share_instagram: formData.get("share_instagram") === "on",
      share_whatsapp: formData.get("share_whatsapp") === "on",
    };

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile!.id);

    if (error) {
      if (error.code === "23505") {
        toast.error("Esse username já está em uso.");
      } else {
        toast.error("Erro ao salvar. Tente novamente.");
      }
    } else {
      toast.success("Perfil atualizado!");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* Public link */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-gray-400 mb-2">Seu perfil público</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white truncate flex-1">{publicUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/20 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {profile?.avatar_url && (
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="h-16 w-16 rounded-full"
          />
          <span className="text-sm text-gray-400">Foto do Google</span>
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          maxLength={14}
          pattern="[a-zA-Z0-9]+"
          defaultValue={profile?.username ?? ""}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <p className="mt-1 text-xs text-gray-500">Até 14 caracteres, apenas letras e números</p>
      </div>

      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-300">
          Nome
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={profile?.display_name ?? ""}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-300">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={profile?.city ?? ""}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-300">
            Estado
          </label>
          <select
            id="state"
            name="state"
            defaultValue={profile?.state ?? ""}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">Selecione</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Instagram */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="instagram" className="block text-sm font-medium text-gray-300">
            Instagram
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="share_instagram"
              defaultChecked={profile?.share_instagram ?? false}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500"
            />
            <span className="text-xs text-gray-400">Exibir no perfil público</span>
          </label>
        </div>
        <input
          id="instagram"
          name="instagram"
          type="text"
          placeholder="@seuusuario"
          defaultValue={profile?.instagram ?? ""}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* WhatsApp */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300">
            WhatsApp
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="share_whatsapp"
              defaultChecked={profile?.share_whatsapp ?? false}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500"
            />
            <span className="text-xs text-gray-400">Exibir no perfil público</span>
          </label>
        </div>
        <input
          id="whatsapp"
          name="whatsapp"
          type="text"
          placeholder="(11) 99999-9999"
          defaultValue={profile?.whatsapp ?? ""}
          className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>


      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
