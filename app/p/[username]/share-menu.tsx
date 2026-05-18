"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Share2, Link2, AlertCircle, Layers, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getShareableStickerList } from "./lib/get-shareable-list";
import type { ShareKind } from "@/lib/format-sticker-list";

type Action = "link" | ShareKind;

interface ShareMenuProps {
  username: string;
  displayName: string;
  totalMissing: number;
  totalDuplicates: number;
  className?: string;
}

export function ShareMenu({
  username,
  displayName,
  totalMissing,
  totalDuplicates,
  className,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const linkBusyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const profileUrl = `https://faltauma.com/p/${username}`;

  const shareLink = async () => {
    if (linkBusyRef.current) return;
    linkBusyRef.current = true;
    setActiveAction("link");
    setOpen(false);
    try {
      const title = `Olha o álbum de ${displayName} no faltaUma`;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text: title, url: profileUrl });
          return;
        } catch {
          // user cancelled or share failed — fall through to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível copiar o link");
      }
    } finally {
      linkBusyRef.current = false;
      if (mountedRef.current) setActiveAction(null);
    }
  };

  const shareList = (kind: ShareKind) => {
    if (pending) return;
    setActiveAction(kind);
    setOpen(false);
    startTransition(async () => {
      try {
        const result = await getShareableStickerList({ username, kind });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const shareTitle =
          kind === "missing"
            ? `Faltam pro ${displayName}`
            : `Repetidas do ${displayName}`;
        if (typeof navigator !== "undefined" && navigator.share) {
          try {
            await navigator.share({ title: shareTitle, text: result.text });
            return;
          } catch {
            // fall through to clipboard
          }
        }
        try {
          await navigator.clipboard.writeText(result.text);
          toast.success("Lista copiada! Cole no WhatsApp 💬");
        } catch {
          toast.error("Não foi possível copiar a lista");
        }
      } finally {
        if (mountedRef.current) setActiveAction(null);
      }
    });
  };

  const anyBusy = pending || activeAction !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={anyBusy}
        aria-busy={anyBusy}
        className={`inline-flex items-center justify-center gap-2 border border-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className ?? ""}`}
        style={{
          fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif',
          fontSize: 11,
          letterSpacing: 0.5,
        }}
      >
        {anyBusy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        COMPARTILHAR
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 gap-1 p-1.5 bg-gray-900 border border-white/10 text-white"
      >
        <MenuItem
          icon={Link2}
          iconColor="text-blue-400"
          label="Link do perfil"
          hint="Compartilhe o álbum"
          busy={activeAction === "link"}
          onClick={shareLink}
        />
        {totalMissing > 0 && (
          <MenuItem
            icon={AlertCircle}
            iconColor="text-red-400"
            label="Lista de faltantes"
            hint={`${totalMissing} ${totalMissing === 1 ? "figurinha" : "figurinhas"}`}
            busy={activeAction === "missing"}
            onClick={() => shareList("missing")}
          />
        )}
        {totalDuplicates > 0 && (
          <MenuItem
            icon={Layers}
            iconColor="text-amber-400"
            label="Lista de repetidas"
            hint={`${totalDuplicates} ${totalDuplicates === 1 ? "figurinha" : "figurinhas"}`}
            busy={activeAction === "duplicates"}
            onClick={() => shareList("duplicates")}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({
  icon: Icon,
  iconColor,
  label,
  hint,
  busy,
  onClick,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className="flex items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {busy ? (
        <Loader2 className={`w-4 h-4 animate-spin ${iconColor}`} />
      ) : (
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
      )}
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-white truncate">{label}</span>
        <span className="text-xs text-gray-400 truncate">{hint}</span>
      </span>
    </button>
  );
}
