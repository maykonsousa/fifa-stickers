"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Invite {
  id: string;
  email: string;
  token: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export function InvitesAdmin({ adminId, invites }: { adminId: string; invites: Invite[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_invites")
      .insert({ email, invited_by: adminId })
      .select("token")
      .single();

    if (!error && data) {
      const baseUrl = window.location.origin;
      setNewLink(`${baseUrl}/admin/register?token=${data.token}`);
      setEmail("");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Convites de Admin</h1>

      {/* Create invite */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-300">Criar novo convite</h2>
        <form onSubmit={handleCreate} className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email do novo admin"
            required
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Gerar convite
          </button>
        </form>
        {newLink && (
          <div className="mt-3 rounded-lg bg-green-900/30 border border-green-800 p-3">
            <p className="text-xs text-green-300 mb-1">Link gerado (envie para o novo admin):</p>
            <code className="block text-xs text-green-200 break-all">{newLink}</code>
          </div>
        )}
      </div>

      {/* Invites list */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expira em</th>
              <th className="px-4 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {invites.map((invite) => {
              const isUsed = !!invite.used_at;
              const isExpired = new Date(invite.expires_at) < new Date();
              return (
                <tr key={invite.id} className="bg-gray-800/50">
                  <td className="px-4 py-3 text-white">{invite.email}</td>
                  <td className="px-4 py-3">
                    {isUsed ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">Usado</span>
                    ) : isExpired ? (
                      <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">Expirado</span>
                    ) : (
                      <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
