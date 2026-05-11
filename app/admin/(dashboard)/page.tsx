import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: stickersCount } = await supabase
    .from("stickers")
    .select("*", { count: "exact", head: true });

  const { count: userStickersCount } = await supabase
    .from("user_stickers")
    .select("*", { count: "exact", head: true });

  const { count: friendshipsCount } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const stats = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Figurinhas cadastradas", value: stickersCount ?? 0 },
    { label: "Figurinhas coletadas", value: userStickersCount ?? 0 },
    { label: "Amizades ativas", value: friendshipsCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
