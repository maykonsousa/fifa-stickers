"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Grid3X3, Users, Repeat2, Settings, LogOut, Menu, X, Shield } from "lucide-react";
import { MarkFU } from "./brand/Logo";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Álbum", icon: LayoutDashboard },
  { href: "/collection", label: "Coleção", icon: Grid3X3 },
  { href: "/friends", label: "Amigos", icon: Users },
  { href: "/trades", label: "Trocas", icon: Repeat2 },
];

export function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMobileDrawer = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAvatarUrl(user?.user_metadata?.avatar_url ?? null);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <MarkFU size={32} />
            <span
              className="text-lg text-white"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
            >
              falta<span className="text-yellow-400">Uma</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-600/20 text-green-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* Avatar menu */}
            <div className="relative ml-3" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center rounded-full ring-2 ring-white/10 hover:ring-green-500/50 transition-all"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white font-medium">
                    ?
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors sm:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <MobileDrawer
        open={mobileOpen}
        onClose={closeMobileDrawer}
        pathname={pathname}
        onLogout={handleLogout}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
      />
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  pathname,
  onLogout,
  avatarUrl,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  onLogout: () => void;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  useEffect(() => {
    onClose();
  }, [onClose, pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] sm:hidden">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="absolute top-0 right-0 bottom-0 w-64 flex flex-col bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/10" />
            )}
            <span className="text-sm font-medium text-white">Menu</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-600/20 text-green-400"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
              pathname === "/profile"
                ? "bg-green-600/20 text-green-400"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-green-600/20 text-green-400"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
