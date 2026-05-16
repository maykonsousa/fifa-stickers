import { createClient } from "@/lib/supabase/server";
import { AdminMetrics } from "./admin-metrics";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: usersCount }, { count: userStickersCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_stickers").select("*", { count: "exact", head: true }),
  ]);

  const kpis: Array<{
    label: string;
    value: number | null;
    comingSoon?: boolean;
  }> = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Figurinhas coletadas", value: userStickersCount ?? 0 },
    { label: "Figurinhas trocadas", value: null, comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-gray-700 bg-gray-800 p-5 relative"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{k.label}</p>
              {k.comingSoon && (
                <span className="rounded bg-brand-gold/20 px-2 py-0.5 text-[10px] font-semibold text-brand-gold">
                  Em breve
                </span>
              )}
            </div>
            <p className="mt-1 text-3xl font-bold text-white">
              {k.value === null ? "—" : k.value.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      <AdminMetrics />
    </div>
  );
}
