"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export function ContactWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-16 right-0 w-80 rounded-2xl border border-white/15 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between bg-brand-grass px-4 py-3">
            <span className="text-sm font-medium text-white">Fale conosco</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ContactForm onSuccess={() => setOpen(false)} />
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-green-600 text-white shadow-lg shadow-black/30 flex items-center justify-center transition-all hover:scale-110 hover:bg-green-700"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
