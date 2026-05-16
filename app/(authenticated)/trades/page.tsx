import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TradesList } from "./trades-list";
import { markAllTradesAsSeen } from "./lib/mark-trades-seen-action";
import type { TradeHistoryRow } from "./lib/types";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Carrega trades com iniciador, counterparty (member/lead) e contagens
  const { data: trades } = await supabase
    .from("trades")
    .select(`
      id,
      initiator_user_id,
      counterparty_user_id,
      counterparty_lead_id,
      counterparty_seen_at,
      created_at,
      initiator:profiles!trades_initiator_user_id_fkey ( display_name, avatar_url ),
      counterparty_user:profiles!trades_counterparty_user_id_fkey ( display_name, avatar_url ),
      counterparty_lead:leads ( name, email ),
      trade_items ( direction, quantity )
    `)
    .or(`initiator_user_id.eq.${user!.id},counterparty_user_id.eq.${user!.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: TradeHistoryRow[] = (trades ?? []).map((t) => {
    const isLead = !!t.counterparty_lead_id;
    const initiator = Array.isArray(t.initiator) ? t.initiator[0] : t.initiator;
    const counterpartyUser = Array.isArray(t.counterparty_user) ? t.counterparty_user[0] : t.counterparty_user;
    const counterpartyLead = Array.isArray(t.counterparty_lead) ? t.counterparty_lead[0] : t.counterparty_lead;
    const items = Array.isArray(t.trade_items) ? t.trade_items : [];

    const userIsInitiator = t.initiator_user_id === user!.id;

    // De qual perspectiva o usuário enxerga? "given" no trade_items é sempre da
    // ótica do iniciador — invertemos pra mostrar como "Você deu / Você recebeu".
    const givenCount = items
      .filter((i: { direction: string; quantity: number }) =>
        userIsInitiator ? i.direction === "given" : i.direction === "received"
      )
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    const receivedCount = items
      .filter((i: { direction: string; quantity: number }) =>
        userIsInitiator ? i.direction === "received" : i.direction === "given"
      )
      .reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

    // O "outro lado": se sou iniciador, é o counterparty; se sou counterparty,
    // é o iniciador. Iniciador é sempre membro (nunca lead).
    let otherKind: "member" | "lead" | "removed";
    let otherName: string;
    let otherEmail: string;
    let otherAvatarUrl: string | null;

    if (userIsInitiator) {
      otherKind = isLead ? "lead" : "member";
      otherName = isLead
        ? counterpartyLead?.name ?? "Lead"
        : counterpartyUser?.display_name ?? "Usuário";
      otherEmail = isLead ? counterpartyLead?.email ?? "" : "";
      otherAvatarUrl = isLead ? null : counterpartyUser?.avatar_url ?? null;
    } else if (initiator) {
      otherKind = "member";
      otherName = initiator.display_name ?? "Usuário";
      otherEmail = "";
      otherAvatarUrl = initiator.avatar_url ?? null;
    } else {
      otherKind = "removed";
      otherName = "Usuário removido";
      otherEmail = "";
      otherAvatarUrl = null;
    }

    return {
      id: t.id,
      other_kind: otherKind,
      other_name: otherName,
      other_email: otherEmail,
      other_avatar_url: otherAvatarUrl,
      given_count: givenCount,
      received_count: receivedCount,
      created_at: t.created_at,
      is_unseen: !userIsInitiator && !t.counterparty_seen_at,
    };
  });

  // Marca como visto após renderizar (next request mostra sem badge)
  await markAllTradesAsSeen();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trocas</h1>
          <p className="mt-1 text-sm text-gray-400">
            Histórico de trocas que você registrou.
          </p>
        </div>
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova troca
        </Link>
      </div>

      <TradesList rows={rows} userId={user!.id} />
    </div>
  );
}
