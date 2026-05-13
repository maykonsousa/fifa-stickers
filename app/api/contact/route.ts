import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    from: "FIFA Stickers <onboarding@resend.dev>",
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
    return NextResponse.json(
      { error: "Erro ao enviar mensagem. Tente novamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
