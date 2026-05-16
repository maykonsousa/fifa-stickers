"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "faltauma_install_banner_dismissed_at";
const INSTALLED_KEY = "faltauma_pwa_installed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

type Platform = "ios-safari" | "ios-other" | "android-other" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS) {
    const isSafari =
      /Safari\//.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }
  const isAndroid = /Android/.test(ua);
  if (isAndroid) return "android-other";
  return null;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  // Chrome Android (standalone), Firefox Android (minimal-ui em algumas
  // versões) e PWAs fullscreen.
  const displayModeMatches =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;
  // iOS Safari legacy flag.
  const iosStandalone =
    (window.navigator as { standalone?: boolean }).standalone === true;
  // Chrome Android lança a PWA com referrer android-app:// ao abrir
  // pelo ícone da tela inicial — fallback caso o display-mode falhe.
  const androidAppReferrer =
    typeof document !== "undefined" &&
    document.referrer.startsWith("android-app://");
  // Flag persistido por nós quando o evento 'appinstalled' dispara — cobre
  // o caso em que o browser não reporta display-mode standalone mas o user
  // efetivamente instalou.
  let installedFlag = false;
  try {
    installedFlag = window.localStorage.getItem(INSTALLED_KEY) !== null;
  } catch {
    // ignore — localStorage indisponível
  }
  return (
    displayModeMatches || iosStandalone || androidAppReferrer || installedFlag
  );
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function wasDismissedRecently() {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallAppBanner({
  onVisibleChange,
}: {
  onVisibleChange?: (visible: boolean) => void;
}) {
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const evaluate = () => {
      const standalone = isStandalone();
      const mobile = isMobileViewport();
      const dismissed = wasDismissedRecently();
      const p = detectPlatform();

      if (standalone || !mobile || dismissed || !p) {
        setPlatform(null);
        setVisible(false);
        onVisibleChange?.(false);
        return;
      }

      setPlatform(p);
      onVisibleChange?.(true);
      if (showTimer) clearTimeout(showTimer);
      showTimer = setTimeout(() => setVisible(true), 1000);
    };

    evaluate();

    // Reavalia quando o display-mode mudar (alguns Androids reportam com
    // atraso o standalone após o launch do WebAPK).
    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", evaluate);

    // Persiste o flag de instalado quando o evento dispara — assim mesmo
    // visitas futuras (sem o evento) reconhecem que o user já instalou.
    const handleInstalled = () => {
      try {
        window.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      evaluate();
    };
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      mql.removeEventListener("change", evaluate);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [onVisibleChange]);

  if (!platform) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore — sem persistência, mas o banner ainda some na sessão
    }
    setVisible(false);
    onVisibleChange?.(false);
  };

  const message =
    platform === "ios-safari" ? (
      <>
        Instale o faltaUma! Toque em{" "}
        <Share className="inline-block w-3.5 h-3.5 mb-0.5 align-middle" /> →{" "}
        <span className="font-semibold">Adicionar à Tela de Início</span>.
      </>
    ) : platform === "ios-other" ? (
      <>Pra instalar, abra essa página no Safari.</>
    ) : (
      <>
        Instale o faltaUma como app! Menu do navegador →{" "}
        <span className="font-semibold">Adicionar à tela inicial</span>.
      </>
    );

  return (
    <div
      role="dialog"
      aria-label="Instalar faltaUma"
      className={`fixed bottom-20 left-4 right-4 z-40 transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-brand-field shadow-2xl px-4 py-3">
        <Download className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
        <p className="flex-1 text-sm text-white leading-snug">{message}</p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="shrink-0 rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
