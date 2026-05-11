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

      <div className="overflow-x-auto rounded-lg border border-gray-700">
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
