import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalDecidedInput {
  proposalId: string;
  ownerName: string;
  recipientEmail: string;
  recipientName: string;
  accepted: boolean;
  appUrl: string;
}

export async function sendProposalDecided(input: ProposalDecidedInput) {
  const supabase = await createClient();

  const verb = input.accepted ? "aceitou" : "recusou";
  const nextSteps = input.accepted
    ? `<p>Combinem o encontro pelo chat dentro do app. Quando se encontrarem, registrem a troca em <a href="${input.appUrl}/trades/new">${input.appUrl}/trades/new</a> pra atualizar as coleções.</p>`
    : `<p>Pode tentar com outra combinação ou propor pra outros usuários.</p>`;

  const html = `
    <h2>${input.ownerName} ${verb} sua proposta</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.ownerName} ${verb} sua proposta de troca.</p>
    ${nextSteps}
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Abrir conversa</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.ownerName} ${verb} sua proposta`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_decided",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalDecided failed", error);
  }
}
