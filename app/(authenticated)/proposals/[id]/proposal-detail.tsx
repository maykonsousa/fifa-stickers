import { formatRelativeDateTime } from "@/lib/format-datetime";
import type { ProposalItemDetail, ProposalStatus } from "../lib/types";

interface Props {
  status: ProposalStatus;
  decidedAt: string | null;
  otherName: string;
  isOwner: boolean;
  itemsWant: ProposalItemDetail[];
  itemsOffer: ProposalItemDetail[];
}

const bannerClass: Record<Exclude<ProposalStatus, "pending">, string> = {
  accepted: "bg-green-500/10 border-green-500/30 text-green-200",
  rejected: "bg-white/5 border-white/10 text-gray-300",
  cancelled: "bg-white/5 border-white/10 text-gray-300",
};

function buildBannerText(
  status: Exclude<ProposalStatus, "pending">,
  decidedAt: string,
  otherName: string,
  isOwner: boolean,
): string {
  const d = formatRelativeDateTime(decidedAt);
  if (status === "accepted") return `✅ Aceita ${d} — combinem o encontro!`;
  if (status === "rejected") return `❌ Recusada ${d}.`;
  // Only the proposer can cancel today, so the canceler is the proposer.
  const by = isOwner ? otherName : "você";
  return `Cancelada por ${by} ${d}.`;
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
        <div className={`rounded-lg border px-4 py-3 text-sm ${bannerClass[status]}`}>
          {buildBannerText(status, decidedAt, otherName, isOwner)}
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
