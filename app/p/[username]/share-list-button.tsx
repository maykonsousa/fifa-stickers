"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Layers, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getShareableStickerList } from "./lib/get-shareable-list";
import type { ShareKind } from "@/lib/format-sticker-list";

interface ShareListButtonProps {
  username: string;
  displayName: string;
  kind: ShareKind;
  disabled?: boolean;
  className?: string;
}

const LABEL: Record<ShareKind, string> = {
  missing: "FALTAM (TEXTO)",
  duplicates: "REPETIDAS (TEXTO)",
};

export function ShareListButton({ username, displayName, kind, disabled, className }: ShareListButtonProps) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  const handleClick = () => {
    if (pending || disabled) return;
    setCopied(false);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    startTransition(async () => {
      const result = await getShareableStickerList({ username, kind });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const shareTitle = kind === "missing"
        ? `Faltam pro ${displayName}`
        : `Repetidas do ${displayName}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: result.text });
          return;
        } catch {
          // user cancelled or share failed — falls through to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(result.text);
        toast.success("Lista copiada! Cole no WhatsApp 💬");
        setCopied(true);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Não foi possível copiar a lista");
      }
    });
  };

  const Icon = kind === "missing" ? AlertCircle : Layers;
  const iconColor = kind === "missing" ? "text-red-400" : "text-amber-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className ?? ""}`}
      style={{
        fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
        fontSize: 11,
        letterSpacing: 0.5,
      }}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className={`w-4 h-4 ${iconColor}`} />
      )}
      {copied ? "COPIADO" : LABEL[kind]}
    </button>
  );
}
