import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProposalsList } from "./proposals-list";
import type { ProposalListRow, ProposalStatus, ProposalTab } from "./lib/types";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: ProposalTab = params.tab === "sent" ? "sent" : "received";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user!.id;

  const filterCol = tab === "received" ? "owner_user_id" : "proposer_user_id";

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      id,
      proposer_user_id,
      owner_user_id,
      status,
      last_activity_at,
      proposer_seen_at,
      owner_seen_at,
      proposer:profiles!proposals_proposer_user_id_fkey ( display_name, avatar_url ),
      owner:profiles!proposals_owner_user_id_fkey ( display_name, avatar_url ),
      proposal_items ( direction, quantity )
    `)
    .eq(filterCol, userId)
    .order("last_activity_at", { ascending: false })
    .limit(50);

  const rows: ProposalListRow[] = (proposals ?? []).map((p) => {
    const other = tab === "received" ? p.proposer : p.owner;
    const otherProfile = Array.isArray(other) ? other[0] : other;
    const items = Array.isArray(p.proposal_items) ? p.proposal_items : [];
    const wantCount = items
      .filter((i: { direction: string; quantity: number }) => i.direction === "want")
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    const offerCount = items
      .filter((i: { direction: string; quantity: number }) => i.direction === "offer")
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

    const isUnseen =
      tab === "received"
        ? !p.owner_seen_at || new Date(p.owner_seen_at) < new Date(p.last_activity_at)
        : new Date(p.proposer_seen_at) < new Date(p.last_activity_at);

    return {
      id: p.id,
      other_user_id: tab === "received" ? p.proposer_user_id : p.owner_user_id,
      other_name: otherProfile?.display_name ?? "Usuário",
      other_avatar_url: otherProfile?.avatar_url ?? null,
      status: p.status as ProposalStatus,
      want_count: wantCount,
      offer_count: offerCount,
      last_activity_at: p.last_activity_at,
      is_unseen: isUnseen,
    };
  });

  // Contagens das abas
  const { count: receivedCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId);
  const { count: sentCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("proposer_user_id", userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Propostas</h1>

      <div className="flex border-b border-white/10">
        <Link
          href="/proposals?tab=received"
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "received" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Recebidas ({receivedCount ?? 0})
          {tab === "received" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </Link>
        <Link
          href="/proposals?tab=sent"
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "sent" ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Enviadas ({sentCount ?? 0})
          {tab === "sent" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
          )}
        </Link>
      </div>

      <ProposalsList rows={rows} tab={tab} />
    </div>
  );
}
