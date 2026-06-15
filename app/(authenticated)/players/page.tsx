import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user!.id;

  // Contagens
  const { count: proposalsCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .or(`owner_user_id.eq.${userId},proposer_user_id.eq.${userId}`);

  const { count: collectorsCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .neq("id", userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trocas</h1>
        <p className="mt-1 text-sm text-gray-400">
          Encontre colecionadores e gerencie suas propostas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/players/collectors"
          className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 text-green-400">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Colecionadores</p>
            <p className="text-xs text-gray-400">
              {collectorsCount ?? 0} pessoas na plataforma
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500" />
        </Link>

        <Link
          href="/players/proposals"
          className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Propostas</p>
            <p className="text-xs text-gray-400">
              {proposalsCount ?? 0} trocas em andamento
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500" />
        </Link>
      </div>
    </div>
  );
}
