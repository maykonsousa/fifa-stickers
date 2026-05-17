import { NextResponse } from "next/server";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, subject, message } = body;

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ["maykonsousa.dev@gmail.com"],
    subject: `[Contato] ${subject}`,
    replyTo: email,
    html: `
      <h2>Nova mensagem de contato</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Assunto:</strong> ${subject}</p>
      <hr />
      <p>${message.replace(/\n/g, "<br />")}</p>
    `,
  });

  if (error) {
    console.error("Contact email failed", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem. Tente novamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
