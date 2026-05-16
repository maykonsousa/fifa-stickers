import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface ProposalCreatedInput {
  proposalId: string;
  proposerName: string;
  recipientEmail: string;
  recipientName: string;
  itemsWant: { stickerLabel: string; quantity: number }[];
  itemsOffer: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendProposalCreated(input: ProposalCreatedInput) {
  const supabase = await createClient();

  const wantList = input.itemsWant
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");
  const offerList = input.itemsOffer
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const html = `
    <h2>${input.proposerName} fez uma proposta de troca</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.proposerName} quer trocar figurinhas com você.</p>
    <p><strong>Ele quer (de você):</strong></p>
    <ul>${wantList}</ul>
    <p><strong>Ele oferece:</strong></p>
    <ul>${offerList}</ul>
    <p><a href="${input.appUrl}/proposals/${input.proposalId}">Ver proposta no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.proposerName} fez uma proposta de troca`,
    html,
  });

  await supabase.from("email_log").insert({
    proposal_id: input.proposalId,
    recipient_email: input.recipientEmail,
    kind: "proposal_created",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendProposalCreated failed", error);
  }
}
