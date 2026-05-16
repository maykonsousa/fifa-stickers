"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

export function ShareProfileButton({
  username,
  displayName,
  className,
}: {
  username: string;
  displayName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `https://faltauma.com/p/${username}`;
    const text = `Olha o álbum de ${displayName} no faltaUma`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
      } catch {
        // user cancelled — silencioso
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors ${className ?? ""}`}
      style={{
        fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
        fontSize: 11,
        letterSpacing: 0.5,
      }}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {copied ? "COPIADO" : "COMPARTILHAR"}
    </button>
  );
}
