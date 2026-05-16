"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendProposalDecided } from "@/lib/email/send-proposal-decided";

export async function decideProposalAction(proposalId: string, accept: boolean) {
  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("decide_proposal", {
    p_proposal_id: proposalId,
    p_accept: accept,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro proponente
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.owner_user_id)
      .single();

    const { data: proposerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.proposer_user_id)
      .single();

    const { data: proposerEmail } = await supabase.rpc("get_user_email", {
      p_user_id: proposal.proposer_user_id,
    });

    if (proposerEmail) {
      await sendProposalDecided({
        proposalId,
        ownerName: ownerProfile?.display_name ?? "Colecionador",
        recipientEmail: proposerEmail as string,
        recipientName: proposerProfile?.display_name ?? "Alguém",
        accepted: accept,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
}
