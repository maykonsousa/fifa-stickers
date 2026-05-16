"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendTradeNotification } from "@/lib/email/send-trade-notification";
import { sendLeadInvite } from "@/lib/email/send-lead-invite";
import type { Counterparty, TradeItem } from "./types";

interface CreateTradeInput {
  counterparty: Counterparty;
  items: TradeItem[];
}

export async function createTradeAction(input: CreateTradeInput) {
  const supabase = await createClient();

  // Resolve counterparty (cria lead se for o caso)
  let counterpartyUserId: string | null = null;
  let counterpartyLeadId: string | null = null;
  let recipientEmail: string;
  let recipientName: string;

  if (input.counterparty.type === "member") {
    counterpartyUserId = input.counterparty.id;
    recipientEmail = input.counterparty.email;
    recipientName = input.counterparty.display_name;
  } else if (input.counterparty.id) {
    // Lead já existente (busca por email achou) — reaproveita
    counterpartyLeadId = input.counterparty.id;
    recipientEmail = input.counterparty.email;
    recipientName = input.counterparty.name;
  } else {
    // Lead novo (criado via form do Step 1)
    const { data: leadId, error: leadError } = await supabase.rpc("find_or_create_lead", {
      p_email: input.counterparty.email,
      p_name: input.counterparty.name,
      p_city: input.counterparty.city ?? null,
      p_state: input.counterparty.state ?? null,
      p_whatsapp: input.counterparty.whatsapp ?? null,
    });
    if (leadError || !leadId) {
      throw new Error(leadError?.message ?? "failed to create lead");
    }
    counterpartyLeadId = leadId as string;
    recipientEmail = input.counterparty.email;
    recipientName = input.counterparty.name;
  }

  // Cria trade
  const { data: tradeId, error: tradeError } = await supabase.rpc("create_trade", {
    p_counterparty_user_id: counterpartyUserId,
    p_counterparty_lead_id: counterpartyLeadId,
    p_items: input.items,
  });
  if (tradeError || !tradeId) {
    throw new Error(tradeError?.message ?? "failed to create trade");
  }

  // Carrega dados para o email
  const { data: { user: initiator } } = await supabase.auth.getUser();
  const { data: initiatorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", initiator!.id)
    .single();

  const stickerIds = input.items.map((i) => i.sticker_id);
  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, code, title")
    .in("id", stickerIds);

  const stickerLabel = (id: number) => {
    const s = stickers?.find((x) => x.id === id);
    return s ? `#${s.code}${s.title ? ` ${s.title}` : ""}` : `#${id}`;
  };

  const itemsReceived = input.items
    .filter((i) => i.direction === "received")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));
  const itemsGiven = input.items
    .filter((i) => i.direction === "given")
    .map((i) => ({ stickerLabel: stickerLabel(i.sticker_id), quantity: i.quantity }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://faltauma.com";

  // Email (fire-and-forget; falha não desfaz)
  if (counterpartyUserId) {
    await sendTradeNotification({
      tradeId: tradeId as string,
      initiatorName: initiatorProfile?.display_name ?? "Alguém",
      recipientEmail,
      recipientName,
      itemsReceived,
      itemsGiven,
      appUrl,
    });
  } else {
    await sendLeadInvite({
      tradeId: tradeId as string,
      leadId: counterpartyLeadId!,
      initiatorName: initiatorProfile?.display_name ?? "Alguém",
      recipientEmail,
      recipientName,
      itemsReceived,
      appUrl,
    });
  }

  revalidatePath("/trades");
  revalidatePath("/collection");
  return tradeId as string;
}
