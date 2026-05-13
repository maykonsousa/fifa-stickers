"use client";

// Logo components for faltaUma
// Drop in components/brand/Logo.tsx
// Usage:
//   <LogoNav />              — nav bar lockup (mark + wordmark)
//   <LogoWordmark />          — large wordmark on light bg (hero / marketing)
//   <LogoWordmark variant="light" /> — wordmark on dark bg (footer / CTA)
//   <MarkFU size={64} />     — square mark for avatars / social
//   <FaviconSVG />           — 32×32 favicon shape

import Link from 'next/link';

export function MarkFU({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} style={{ display: 'block' }} aria-hidden>
      <rect width="96" height="96" rx="18" fill="#0a3d2a" />
      <rect x="6" y="6" width="84" height="84" rx="14" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      <text x="28" y="68" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="62" fill="#fef9e8" letterSpacing="-3">f</text>
      <text x="50" y="68" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="62" fill="#fbbf24" letterSpacing="-3">U</text>
    </svg>
  );
}

export function LogoWordmark({ variant = 'dark', width = 280 }: { variant?: 'dark' | 'light'; width?: number }) {
  const isLight = variant === 'light';
  const textColor = isLight ? '#fef9e8' : '#18181b';
  const accentColor = isLight ? '#fbbf24' : '#0a3d2a';
  const dotStroke = isLight ? '#fef9e8' : '#18181b';
  const sublineColor = isLight ? '#fef9e8' : '#18181b';

  return (
    <svg viewBox="0 0 720 220" width={width} height={width * 220 / 720} style={{ display: 'block' }} aria-label="faltaUma">
      <text x="40" y="148" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="120" fill={textColor} letterSpacing="-4">falta</text>
      <g transform="translate(213 38)">
        <rect x="-16" y="-16" width="32" height="32" rx="6" fill="none" stroke={accentColor} strokeWidth="3" strokeDasharray="4 4" />
        <text x="0" y="6" textAnchor="middle" fontFamily='"JetBrains Mono", ui-monospace, monospace' fontSize="14" fill={accentColor} opacity={isLight ? 0.85 : 0.7}>?</text>
      </g>
      <text x="288" y="148" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="120" fill={accentColor} letterSpacing="-4">Uma</text>
      <circle cx="610" cy="146" r="14" fill="#fbbf24" stroke={dotStroke} strokeWidth="3" />
      <text x="44" y="192" fontFamily='"JetBrains Mono", ui-monospace, monospace' fontSize="13" fill={sublineColor} opacity={isLight ? 0.6 : 0.55} letterSpacing="3">
        ÁLBUM · COLECIONÁVEL · 2026
      </text>
    </svg>
  );
}

export function LogoNav() {
  return (
    <Link href="/" className="flex items-center gap-3 group" aria-label="faltaUma — início">
      <MarkFU size={40} />
      <div className="leading-none">
        <div
          style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
          className="text-[22px] text-zinc-900"
        >
          falta<span className="text-[#0a3d2a]">Uma</span>
        </div>
        <div
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 2 }}
          className="text-[9px] text-zinc-900/50 mt-1"
        >
          ÁLBUM · 2026
        </div>
      </div>
    </Link>
  );
}

// Use this in your <head> via app/icon.tsx or as /public/brand/favicon.svg
export function FaviconSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <rect width="32" height="32" rx="6" fill="#0a3d2a" />
      <text x="8" y="24" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="22" fill="#fef9e8" letterSpacing="-1">f</text>
      <text x="17" y="24" fontFamily='"Archivo Black", "Arial Black", system-ui, sans-serif' fontSize="22" fill="#fbbf24" letterSpacing="-1">U</text>
    </svg>
  );
}
