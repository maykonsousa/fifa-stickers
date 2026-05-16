import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalMessageInput {
  proposalId: string;
  senderName: string;
  recipientEmail: string;
  recipientName: string;
  messageExcerpt: string; // até 200 chars; truncado pelo caller
  appUrl: string;
}

const DEBOUNCE_MINUTES = 15;

export async function sendProposalMessage(input: ProposalMessageInput) {
  const supabase = await createClient();

  // Debounce: se já mandou email de chat pra esse destinatário/proposta nos últimos 15min, pula.
  const { data: lastEmail } = await supabase
    .from("email_log")
    .select("sent_at")
    .eq("proposal_id", input.proposalId)
    .eq("recipient_email", input.recipientEmail)
    .eq("kind", "proposal_message")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEmail?.sent_at) {
    const ageMinutes = (Date.now() - new Date(lastEmail.sent_at).getTime()) / 60_000;
    if (ageMinutes < DEBOUNCE_MINUTES) {
      return; // skip
    }
  }

  const html = `
    <h2>Nova mensagem na proposta com ${input.senderName}</h2>
    <p>${input.senderName} respondeu na conversa:</p>
    <blockquote style="border-left:3px solid #ddd;padding-left:1em;color:#555;">
      ${input.messageExcerpt}
    </blockquote>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Continuar conversa</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `Nova mensagem na proposta com ${input.senderName}`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_message",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalMessage failed", error);
  }
}
