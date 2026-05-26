"use client";

// Legenda visual dos estados do card. As cores aqui precisam casar com
// as classes aplicadas em sticker-card.tsx (ownershipWrap).
export function StickerLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
      <LegendSwatch
        swatchClass="bg-white/10"
        label="Falta"
      />
      <LegendSwatch
        swatchClass="bg-gradient-to-br from-gray-300 via-white to-gray-400"
        label="Tenho"
      />
      <LegendSwatch
        swatchClass="bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500"
        label="Repetida"
      />
    </div>
  );
}

function LegendSwatch({
  swatchClass,
  label,
}: {
  swatchClass: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={`inline-block h-3.5 w-3.5 rounded-sm ${swatchClass}`}
      />
      <span>{label}</span>
    </span>
  );
}
