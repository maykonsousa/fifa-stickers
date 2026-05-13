import { useState, useRef } from "react";
import { toast } from "sonner";

interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export function useContactForm() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (payload: ContactPayload) => {
    setSending(true);
    setError("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        subject: payload.subject || "Contato via Widget",
      }),
    });

    if (res.ok) {
      setSent(true);
      formRef.current?.reset();
      toast.success("Mensagem enviada! Responderemos em breve.");
    } else {
      const data = await res.json();
      const msg = data.error || "Erro ao enviar. Tente novamente.";
      setError(msg);
      toast.error(msg);
    }

    setSending(false);
  };

  const reset = () => {
    setSent(false);
    setError("");
  };

  return { sending, sent, error, formRef, submit, reset };
}
