"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/supabase/get-user-email";
import { sendProposalCreated } from "@/lib/email/send-proposal-created";
import type { ProposalItem } from "./types";

interface CreateProposalInput {
  ownerUserId: string;
  items: ProposalItem[];
}

export async function createProposalAction(input: CreateProposalInput): Promise<string> {
  const supabase = await createClient();

  const { data: proposalId, error: rpcError } = await supabase.rpc("create_proposal", {
    p_owner_user_id: input.ownerUserId,
    p_items: input.items,
  });
  if (rpcError || !proposalId) {
    throw new Error(rpcError?.message ?? "failed to create proposal");
  }

  // Carrega dados pro email
  const { data: { user: proposer } } = await supabase.auth.getUser();
  const { data: proposerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", proposer!.id)
    .single();

  const { data: ownerData } = await supabase
    .from("profiles")
    .select("display_name, id")
    .eq("id", input.ownerUserId)
    .single();

  const ownerEmail = await getUserEmail(supabase, input.ownerUserId);

  // Busca dados das figurinhas
  const stickerIds = input.items.map((i) => i.sticker_id);
  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, code, title")
    .in("id", stickerIds);

  const stickerLabel = (id: number) => {
    const s = stickers?.find((x) => x.id === id);
    return s ? `#${s.code}${s.title ? ` ${s.title}` : ""}` : `#${id}`;
  };

  const itemsWant = input.items
    .filter((i) => i.direction === "want")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id) }));
  const itemsOffer = input.items
    .filter((i) => i.direction === "offer")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id) }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com";

  if (ownerEmail) {
    await sendProposalCreated({
      proposalId: proposalId as string,
      proposerName: proposerProfile?.display_name ?? "Alguém",
      recipientEmail: ownerEmail,
      recipientName: ownerData?.display_name ?? "Colecionador",
      itemsWant,
      itemsOffer,
      appUrl,
    });
  }

  return proposalId as string;
}
