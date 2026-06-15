"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserEmail } from "@/lib/supabase/get-user-email";
import { sendProposalCancelled } from "@/lib/email/send-proposal-cancelled";

export async function cancelProposalAction(proposalId: string) {
  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("cancel_proposal", {
    p_proposal_id: proposalId,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro dono
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: proposerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.proposer_user_id)
      .single();
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", proposal.owner_user_id)
      .single();
    const ownerEmail = await getUserEmail(supabase, proposal.owner_user_id);

    if (ownerEmail) {
      await sendProposalCancelled({
        proposalId,
        proposerName: proposerProfile?.display_name ?? "Alguém",
        recipientEmail: ownerEmail,
        recipientName: ownerProfile?.display_name ?? "Colecionador",
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/players/proposals/${proposalId}`);
  revalidatePath("/players/proposals");
  revalidatePath("/players");
}
