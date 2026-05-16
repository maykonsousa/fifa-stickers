import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface LeadInviteInput {
  tradeId: string;
  leadId: string;
  initiatorName: string;
  recipientEmail: string;
  recipientName: string;
  itemsReceived: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendLeadInvite(input: LeadInviteInput) {
  const supabase = await createClient();

  // Idempotência: se já tem email_invite_sent_at, não reenvia
  const { data: lead } = await supabase
    .from("leads")
    .select("email_invite_sent_at")
    .eq("id", input.leadId)
    .single();

  if (lead?.email_invite_sent_at) {
    return;
  }

  const receivedList = input.itemsReceived
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const signupUrl = `${input.appUrl}/login?lead_invite=${input.leadId}`;
  const totalReceived = input.itemsReceived.reduce((sum, i) => sum + i.quantity, 0);

  const html = `
    <h2>Você fez uma troca de figurinhas com ${input.initiatorName} — bem-vindo ao FaltaUma!</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.initiatorName} registrou uma troca de figurinhas com você no FaltaUma, um app gratuito pra controlar seu álbum da Copa.</p>
    <p>Crie sua conta e suas ${totalReceived} ${totalReceived === 1 ? "figurinha vai aparecer" : "figurinhas vão aparecer"} na sua coleção:</p>
    <ul>${receivedList}</ul>
    <p><a href="${signupUrl}">Criar conta com Google</a></p>
    <p><small>Conta vinculada a ${input.recipientEmail} — depois você pode trocar.</small></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `Você fez uma troca de figurinhas com ${input.initiatorName} — bem-vindo ao FaltaUma!`,
    html,
  });

  await supabase.from("email_log").insert({
    trade_id: input.tradeId,
    recipient_email: input.recipientEmail,
    kind: "lead_invite",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (!error) {
    await supabase
      .from("leads")
      .update({ email_invite_sent_at: new Date().toISOString() })
      .eq("id", input.leadId);
  } else {
    console.error("sendLeadInvite failed", error);
  }
}
