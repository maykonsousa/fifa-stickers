import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProposalDetail } from "./proposal-detail";
import { markSeenAction } from "../lib/mark-seen-action";
import type { ProposalItemDetail, ProposalStatus } from "../lib/types";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`
      id,
      proposer_user_id,
      owner_user_id,
      status,
      created_at,
      decided_at,
      last_activity_at,
      proposer:profiles!proposals_proposer_user_id_fkey ( id, display_name, avatar_url ),
      owner:profiles!proposals_owner_user_id_fkey ( id, display_name, avatar_url ),
      proposal_items ( sticker_id, direction, quantity, stickers ( code, title, image_url ) )
    `)
    .eq("id", id)
    .single();

  if (!proposal) {
    notFound();
  }

  const isOwner = proposal.owner_user_id === user!.id;
  const isProposer = proposal.proposer_user_id === user!.id;
  if (!isOwner && !isProposer) {
    notFound();
  }

  const proposer = Array.isArray(proposal.proposer) ? proposal.proposer[0] : proposal.proposer;
  const owner = Array.isArray(proposal.owner) ? proposal.owner[0] : proposal.owner;
  const otherProfile = isOwner ? proposer : owner;

  const items: ProposalItemDetail[] = (proposal.proposal_items ?? []).map((it: any) => {
    const sticker = Array.isArray(it.stickers) ? it.stickers[0] : it.stickers;
    return {
      sticker_id: it.sticker_id,
      direction: it.direction,
      quantity: it.quantity,
      code: sticker?.code ?? "",
      title: sticker?.title ?? null,
      image_url: sticker?.image_url ?? null,
    };
  });

  const itemsWant = items.filter((i) => i.direction === "want");
  const itemsOffer = items.filter((i) => i.direction === "offer");

  await markSeenAction(id);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/proposals" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3">
        {otherProfile?.avatar_url ? (
          <img src={otherProfile.avatar_url} alt={otherProfile.display_name ?? ""} className="h-12 w-12 rounded-full" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-grass/20 text-base font-bold text-brand-grass">
            {(otherProfile?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{otherProfile?.display_name ?? "Usuário"}</h1>
          <p className="text-xs text-gray-500">Criada em {new Date(proposal.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <ProposalDetail
        status={proposal.status as ProposalStatus}
        decidedAt={proposal.decided_at}
        otherName={otherProfile?.display_name ?? "Usuário"}
        isOwner={isOwner}
        itemsWant={itemsWant}
        itemsOffer={itemsOffer}
      />

      {/* Chat e ações serão adicionados nas Tasks 20 e 21 */}
    </div>
  );
}
