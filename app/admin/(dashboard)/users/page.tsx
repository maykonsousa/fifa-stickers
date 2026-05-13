import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city, state, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Usuários</h1>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {profiles?.map((profile) => (
          <div key={profile.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 text-sm font-bold text-white">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{profile.display_name}</p>
                <p className="text-xs text-gray-400">
                  {[profile.city, profile.state].filter(Boolean).join(", ") || "Sem localização"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Cadastro: {new Date(profile.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {profiles?.map((profile) => (
              <tr key={profile.id} className="bg-gray-800/50 hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-white">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white">{profile.display_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{profile.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{profile.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
