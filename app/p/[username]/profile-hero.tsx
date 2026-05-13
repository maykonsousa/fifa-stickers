import { Trophy, AlertCircle, Layers } from "lucide-react";
import { InstagramLogo, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

interface ProfileHeroProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
  shareInstagram: boolean;
  shareWhatsapp: boolean;
  totalOwned: number;
  totalMissing: number;
  totalDuplicates: number;
  totalStickers: number;
  percent: number;
}

export function ProfileHero({
  displayName,
  username,
  avatarUrl,
  city,
  state,
  instagram,
  whatsapp,
  shareInstagram,
  shareWhatsapp,
  totalOwned,
  totalMissing,
  totalDuplicates,
  totalStickers,
  percent,
}: ProfileHeroProps) {
  const stats = [
    { icon: Trophy, label: "Coladas", value: totalOwned, color: "text-green-400" },
    { icon: AlertCircle, label: "Faltam", value: totalMissing, color: "text-red-400" },
    { icon: Layers, label: "Repetidas", value: totalDuplicates, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Identity */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-full ring-2 ring-white/10" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-white/10 text-2xl font-bold text-green-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
          >
            {displayName}
          </h1>
          <p className="text-sm text-gray-400">@{username}</p>
          {city && state && (
            <p className="text-sm text-gray-400">{city}, {state}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <div
              className="text-xl text-white"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}
            >
              {stat.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Progresso do álbum</span>
          <span
            className="text-sm text-white"
            style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif' }}
          >
            {percent}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">{totalOwned} de {totalStickers} figurinhas</p>
      </div>

      {/* Contact */}
      {((shareInstagram && instagram) || (shareWhatsapp && whatsapp)) && (
        <div className="flex items-center gap-3 flex-wrap">
          {shareInstagram && instagram && (
            <a
              href={`https://instagram.com/${instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              <InstagramLogo weight="fill" className="w-4 h-4 text-pink-400" /> {instagram}
            </a>
          )}
          {shareWhatsapp && whatsapp && (
            <a
              href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              <WhatsappLogo weight="fill" className="w-4 h-4 text-green-400" /> WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
