import { createClient } from "@/lib/supabase/server";
import { AdminMetrics } from "./admin-metrics";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: usersCount }, { count: userStickersCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_stickers").select("*", { count: "exact", head: true }),
  ]);

  const kpis = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Figurinhas coletadas", value: userStickersCount ?? 0 },
    { label: "Figurinhas trocadas", value: null, comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <AdminMetrics kpis={kpis} />
    </div>
  );
}
