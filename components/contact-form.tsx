"use client";

import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContactForm } from "@/hooks/use-contact-form";

export function ContactForm({ onSuccess }: { onSuccess?: () => void }) {
  const { sending, sent, error, formRef, submit, reset } = useContactForm();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await submit({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    });
  };

  if (sent) {
    return (
      <div className="p-6 text-center">
        <p className="text-green-400 text-sm font-medium">Mensagem enviada!</p>
        <p className="text-zinc-400 text-xs mt-1">Responderemos em breve.</p>
        <button
          onClick={() => { reset(); onSuccess?.(); }}
          className="mt-4 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-3">
      <Input name="name" type="text" required placeholder="Seu nome" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500" />
      <Input name="email" type="email" required placeholder="Seu email" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500" />
      <Textarea name="message" rows={3} required placeholder="Sua mensagem..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 resize-none" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-grass px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
