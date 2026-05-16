"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendProposalMessage } from "@/lib/email/send-proposal-message";

const EXCERPT_MAX = 200;

export async function postMessageAction(proposalId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("mensagem vazia");
  }
  if (trimmed.length > 2000) {
    throw new Error("mensagem muito longa");
  }

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("post_proposal_message", {
    p_proposal_id: proposalId,
    p_body: trimmed,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // Email pro outro lado (com debounce no sender)
  const { data: proposal } = await supabase
    .from("proposals")
    .select("proposer_user_id, owner_user_id")
    .eq("id", proposalId)
    .single();

  if (proposal) {
    const { data: { user } } = await supabase.auth.getUser();
    const callerId = user!.id;
    const recipientId =
      callerId === proposal.proposer_user_id
        ? proposal.owner_user_id
        : proposal.proposer_user_id;

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", callerId)
      .single();
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", recipientId)
      .single();
    const { data: recipientEmail } = await supabase.rpc("get_user_email", {
      p_user_id: recipientId,
    });

    if (recipientEmail) {
      const excerpt =
        trimmed.length > EXCERPT_MAX ? trimmed.slice(0, EXCERPT_MAX) + "…" : trimmed;
      await sendProposalMessage({
        proposalId,
        senderName: senderProfile?.display_name ?? "Alguém",
        recipientEmail: recipientEmail as string,
        recipientName: recipientProfile?.display_name ?? "Colecionador",
        messageExcerpt: excerpt,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com",
      });
    }
  }

  revalidatePath(`/proposals/${proposalId}`);
}
