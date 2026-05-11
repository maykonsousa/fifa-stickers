"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const updates = {
      display_name: formData.get("display_name") as string,
      city: formData.get("city") as string || null,
      state: formData.get("state") as string || null,
      instagram: formData.get("instagram") as string || null,
      whatsapp: formData.get("whatsapp") as string || null,
    };

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile!.id);

    if (error) {
      setMessage("Erro ao salvar. Tente novamente.");
    } else {
      setMessage("Perfil atualizado!");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {profile?.avatar_url && (
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="h-16 w-16 rounded-full"
          />
          <span className="text-sm text-gray-500">Foto do Google</span>
        </div>
      )}

      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={profile?.display_name ?? ""}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={profile?.city ?? ""}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="state"
            name="state"
            defaultValue={profile?.state ?? ""}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">Selecione</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
          Instagram
        </label>
        <input
          id="instagram"
          name="instagram"
          type="text"
          placeholder="@seuusuario"
          defaultValue={profile?.instagram ?? ""}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <p className="mt-1 text-xs text-gray-500">Visível apenas para amigos</p>
      </div>

      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="text"
          placeholder="(11) 99999-9999"
          defaultValue={profile?.whatsapp ?? ""}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <p className="mt-1 text-xs text-gray-500">Visível apenas para amigos</p>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("Erro") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

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
