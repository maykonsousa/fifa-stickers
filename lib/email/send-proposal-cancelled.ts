import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalCancelledInput {
  proposalId: string;
  proposerName: string;
  recipientEmail: string;
  recipientName: string;
  appUrl: string;
}

export async function sendProposalCancelled(input: ProposalCancelledInput) {
  const supabase = await createClient();

  const html = `
    <h2>${input.proposerName} cancelou a proposta</h2>
    <p>Oi ${input.recipientName},</p>
    <p>A proposta enviada por ${input.proposerName} foi cancelada. Sem ação necessária.</p>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Ver no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.proposerName} cancelou a proposta`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_cancelled",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalCancelled failed", error);
  }
}
