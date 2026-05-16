"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader2 } from "lucide-react";

interface StickerDetail {
  id: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

interface DetailItem {
  direction: "given" | "received";
  quantity: number;
  sticker: StickerDetail;
}

interface TradeDetail {
  initiatorUserId: string | null;
  createdAt: string;
  otherName: string;
  otherAvatar: string | null;
  givenItems: DetailItem[]; // do ponto de vista do usuário logado
  receivedItems: DetailItem[];
}

interface Props {
  tradeId: string | null;
  userId: string;
  onClose: () => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradeDetailDrawer({ tradeId, userId, onClose }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<TradeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownedCounts, setOwnedCounts] = useState<Map<number, number>>(new Map());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tradeId) {
      setDetail(null);
      setOwnedCounts(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: trade } = await supabase
        .from("trades")
        .select(`
          id,
          initiator_user_id,
          created_at,
          initiator:profiles!trades_initiator_user_id_fkey ( display_name, avatar_url ),
          counterparty_user:profiles!trades_counterparty_user_id_fkey ( display_name, avatar_url ),
          counterparty_lead:leads ( name )
        `)
        .eq("id", tradeId)
        .single();

      const { data: items } = await supabase
        .from("trade_items")
        .select("direction, quantity, sticker:stickers(id, code, title, image_url)")
        .eq("trade_id", tradeId);

      if (cancelled || !trade) {
        setLoading(false);
        return;
      }

      const initiator = Array.isArray(trade.initiator) ? trade.initiator[0] : trade.initiator;
      const counterpartyUser = Array.isArray(trade.counterparty_user)
        ? trade.counterparty_user[0]
        : trade.counterparty_user;
      const counterpartyLead = Array.isArray(trade.counterparty_lead)
        ? trade.counterparty_lead[0]
        : trade.counterparty_lead;

      const userIsInitiator = trade.initiator_user_id === userId;

      let otherName: string;
      let otherAvatar: string | null;
      if (userIsInitiator) {
        otherName = counterpartyLead?.name ?? counterpartyUser?.display_name ?? "Usuário";
        otherAvatar = counterpartyUser?.avatar_url ?? null;
      } else {
        otherName = initiator?.display_name ?? "Usuário removido";
        otherAvatar = initiator?.avatar_url ?? null;
      }

      const typedItems = ((items ?? []) as unknown as DetailItem[]).map((it) => ({
        ...it,
        sticker: Array.isArray(it.sticker) ? it.sticker[0] : it.sticker,
      }));

      // Inverte direções pra ótica do viewer
      const given = typedItems.filter((it) =>
        userIsInitiator ? it.direction === "given" : it.direction === "received",
      );
      const received = typedItems.filter((it) =>
        userIsInitiator ? it.direction === "received" : it.direction === "given",
      );

      // Carrega quantas cópias o usuário tem de cada figurinha recebida
      // (pra mostrar o estado atual e o botão de remover)
      const receivedIds = received.map((it) => it.sticker.id);
      const counts = new Map<number, number>();
      if (receivedIds.length > 0) {
        const { data: ownedRows } = await supabase
          .from("user_stickers")
          .select("sticker_id")
          .eq("user_id", userId)
          .in("sticker_id", receivedIds);
        for (const r of (ownedRows ?? []) as { sticker_id: number }[]) {
          counts.set(r.sticker_id, (counts.get(r.sticker_id) ?? 0) + 1);
        }
      }

      if (cancelled) return;

      setDetail({
        initiatorUserId: trade.initiator_user_id,
        createdAt: trade.created_at,
        otherName,
        otherAvatar,
        givenItems: given,
        receivedItems: received,
      });
      setOwnedCounts(counts);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tradeId, userId]);

  async function handleAdd(stickerId: number) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_stickers")
      .insert({ user_id: userId, sticker_id: stickerId });
    if (error) {
      toast.error("Erro ao adicionar.");
      setBusy(false);
      return;
    }
    setOwnedCounts((prev) => {
      const next = new Map(prev);
      next.set(stickerId, (next.get(stickerId) ?? 0) + 1);
      return next;
    });
    toast.success("Figurinha adicionada!");
    router.refresh();
    setBusy(false);
  }

  async function handleRemove(stickerId: number) {
    setBusy(true);
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("user_stickers")
      .select("id")
      .eq("user_id", userId)
      .eq("sticker_id", stickerId)
      .limit(1);
    if (rows && rows.length > 0) {
      await supabase.from("user_stickers").delete().eq("id", rows[0].id);
    }
    setOwnedCounts((prev) => {
      const next = new Map(prev);
      const current = next.get(stickerId) ?? 0;
      if (current <= 1) next.delete(stickerId);
      else next.set(stickerId, current - 1);
      return next;
    });
    toast.success("Figurinha removida.");
    router.refresh();
    setBusy(false);
  }

  return (
    <Drawer open={!!tradeId} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92vh] bg-gray-900 text-white border-white/10">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="font-sans text-white text-base font-medium">
            Detalhes da troca
          </DrawerTitle>
        </DrawerHeader>

        {loading || !detail ? (
          <div className="px-4 pb-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-grass" />
          </div>
        ) : (
          <div className="px-4 pb-6 flex flex-col gap-5 overflow-y-auto">
            {/* Header com info do outro lado */}
            <div className="flex items-center gap-3">
              {detail.otherAvatar ? (
                <img
                  src={detail.otherAvatar}
                  alt={detail.otherName}
                  className="h-12 w-12 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-grass/20 text-base font-bold text-brand-grass flex-shrink-0">
                  {detail.otherName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{detail.otherName}</p>
                <p className="text-xs text-gray-400">{formatDateTime(detail.createdAt)}</p>
              </div>
            </div>

            {/* Seção: Você deu */}
            <Section title="Você deu" items={detail.givenItems} emptyText="Nenhuma figurinha." />

            {/* Seção: Você recebeu — com add/remove */}
            <Section
              title="Você recebeu"
              items={detail.receivedItems}
              emptyText="Nenhuma figurinha."
              interactive={{
                ownedCounts,
                busy,
                onAdd: handleAdd,
                onRemove: handleRemove,
              }}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface InteractiveProps {
  ownedCounts: Map<number, number>;
  busy: boolean;
  onAdd: (stickerId: number) => void;
  onRemove: (stickerId: number) => void;
}

function Section({
  title,
  items,
  emptyText,
  interactive,
}: {
  title: string;
  items: DetailItem[];
  emptyText: string;
  interactive?: InteractiveProps;
}) {
  const total = items.reduce((sum, it) => sum + it.quantity, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest text-gray-400">{title}</h3>
        <span className="text-xs text-gray-500">
          {total} {total === 1 ? "figurinha" : "figurinhas"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {items.map((it) => (
            <StickerThumb
              key={`${it.direction}-${it.sticker.id}`}
              sticker={it.sticker}
              quantity={it.quantity}
              interactive={interactive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StickerThumb({
  sticker,
  quantity,
  interactive,
}: {
  sticker: StickerDetail;
  quantity: number;
  interactive?: InteractiveProps;
}) {
  const ownedCount = interactive?.ownedCounts.get(sticker.id) ?? 0;
  const hasIt = ownedCount > 0;
  const isDuplicate = ownedCount > 1;
  const showOwnership = !!interactive;

  const borderClass =
    showOwnership && hasIt
      ? isDuplicate
        ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        : "bg-gradient-to-br from-gray-300 via-white to-gray-400"
      : "";

  return (
    <div className="flex flex-col">
      <div
        className={`relative rounded-lg p-[2px] ${showOwnership && hasIt ? borderClass : ""}`}
      >
        <div
          className={`relative aspect-[2/3] overflow-hidden rounded-lg ${
            showOwnership && !hasIt
              ? "bg-gray-800/50 border border-white/10"
              : "bg-gray-800 border border-white/10"
          }`}
        >
          {sticker.image_url ? (
            <img src={sticker.image_url} alt={sticker.code} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-start p-2">
              <span className="text-xs font-bold text-white/50">{sticker.code}</span>
              <div className="flex flex-1 w-full items-center justify-center">
                <svg className="h-10 w-10 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              {sticker.title && (
                <p className="w-full text-center text-[10px] font-bold text-white/80 truncate">
                  {sticker.title}
                </p>
              )}
            </div>
          )}
          {sticker.image_url && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-3">
              <span className="text-[10px] font-bold text-white">{sticker.code}</span>
            </div>
          )}
          {isDuplicate && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
              {ownedCount - 1}
            </span>
          )}
          {!interactive && quantity > 1 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
              ×{quantity}
            </span>
          )}
        </div>
      </div>

      {interactive && (
        <div className="mt-2 flex justify-center gap-2">
          <button
            onClick={() => interactive.onAdd(sticker.id)}
            disabled={interactive.busy}
            className="rounded-lg bg-brand-grass/20 px-3 py-1.5 text-sm font-medium text-brand-grass hover:bg-brand-grass/30 disabled:opacity-50 transition-colors"
            aria-label="Adicionar à coleção"
          >
            +
          </button>
          {hasIt && (
            <button
              onClick={() => interactive.onRemove(sticker.id)}
              disabled={interactive.busy}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
              aria-label="Remover da coleção"
            >
              −
            </button>
          )}
        </div>
      )}
    </div>
  );
}
