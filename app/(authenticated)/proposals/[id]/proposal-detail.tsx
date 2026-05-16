import type { ProposalItemDetail, ProposalStatus } from "../lib/types";

interface Props {
  status: ProposalStatus;
  decidedAt: string | null;
  otherName: string;
  isOwner: boolean;
  itemsWant: ProposalItemDetail[];
  itemsOffer: ProposalItemDetail[];
}

const statusBanner: Record<ProposalStatus, { text: (n: string, d: string) => string; cls: string }> = {
  pending: { text: () => "", cls: "" },
  accepted: {
    text: (_n, d) => `✅ Aceita em ${d} — combinem o encontro!`,
    cls: "bg-green-500/10 border-green-500/30 text-green-200",
  },
  rejected: {
    text: (_n, d) => `❌ Recusada em ${d}.`,
    cls: "bg-white/5 border-white/10 text-gray-300",
  },
  cancelled: {
    text: (n, d) => `Cancelada por ${n} em ${d}.`,
    cls: "bg-white/5 border-white/10 text-gray-300",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StickerItem({ item }: { item: ProposalItemDetail }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {item.image_url ? (
        <img src={item.image_url} alt={item.code} className="h-12 w-9 rounded object-cover" />
      ) : (
        <div className="h-12 w-9 rounded bg-white/10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          #{item.code} {item.title ?? ""}
        </p>
        {item.quantity > 1 && (
          <p className="text-xs text-gray-500">×{item.quantity}</p>
        )}
      </div>
    </li>
  );
}

export function ProposalDetail({ status, decidedAt, otherName, isOwner, itemsWant, itemsOffer }: Props) {
  const wantLabel = isOwner ? `Ele quer (você dá)` : "Você quer (recebe)";
  const offerLabel = isOwner ? "Ele oferece (você recebe)" : "Você oferece (entrega)";

  return (
    <div className="space-y-4">
      {status !== "pending" && decidedAt && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${statusBanner[status].cls}`}>
          {statusBanner[status].text(otherName, formatDate(decidedAt))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white mb-2">{wantLabel}</h3>
        <ul className="divide-y divide-white/5">
          {itemsWant.map((item) => (
            <StickerItem key={`want-${item.sticker_id}`} item={item} />
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white mb-2">{offerLabel}</h3>
        <ul className="divide-y divide-white/5">
          {itemsOffer.map((item) => (
            <StickerItem key={`offer-${item.sticker_id}`} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}
