import { resend, EMAIL_FROM } from "./resend";
import { createClient } from "@/lib/supabase/server";

interface TradeNotificationInput {
  tradeId: string;
  initiatorName: string;
  recipientEmail: string;
  recipientName: string;
  itemsReceived: { stickerLabel: string; quantity: number }[];
  itemsGiven: { stickerLabel: string; quantity: number }[];
  appUrl: string;
}

export async function sendTradeNotification(input: TradeNotificationInput) {
  const supabase = await createClient();

  const receivedList = input.itemsReceived
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");
  const givenList = input.itemsGiven
    .map((i) => `<li>${i.stickerLabel} — ${i.quantity} ${i.quantity === 1 ? "cópia" : "cópias"}</li>`)
    .join("");

  const html = `
    <h2>${input.initiatorName} registrou uma troca com você no FaltaUma</h2>
    <p>Oi ${input.recipientName},</p>
    <p>${input.initiatorName} registrou uma troca de figurinhas com você.</p>
    <p><strong>Você recebeu:</strong></p>
    <ul>${receivedList}</ul>
    <p><strong>Você deu:</strong></p>
    <ul>${givenList}</ul>
    <p>Sua coleção foi atualizada automaticamente.</p>
    <p>Se discorda da troca, fale diretamente com ${input.initiatorName}. Você pode editar sua coleção manualmente em <a href="${input.appUrl}/collection">${input.appUrl}/collection</a>.</p>
    <p><a href="${input.appUrl}/trades">Ver no app</a></p>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [input.recipientEmail],
    subject: `${input.initiatorName} registrou uma troca com você no FaltaUma`,
    html,
  });

  await supabase.from("email_log").insert({
    trade_id: input.tradeId,
    recipient_email: input.recipientEmail,
    kind: "trade_notification",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  if (error) {
    console.error("sendTradeNotification failed", error);
  }
}
