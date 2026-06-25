"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Settings, LogOut, Shield, User, MessageCircle, X, LayoutDashboard, Grid3X3, Repeat2, UserSearch, MessageSquare, BookOpen } from "lucide-react";
import { MarkFU } from "./brand/Logo";
import { AlbumSelector } from "@/components/album-selector";
import { ContactForm } from "@/components/contact-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TopBarProps {
  isAdmin?: boolean;
  proposalsBadge?: number;
}

const navLinks = [
  { href: "/dashboard", label: "Álbum", icon: LayoutDashboard },
  { href: "/collection", label: "Coleção", icon: Grid3X3 },
  { href: "/players", label: "Colecionadores", icon: UserSearch },
  { href: "/trades", label: "Trocas", icon: Repeat2 },
  { href: "/players/proposals", label: "Propostas", icon: MessageSquare },
];

export function TopBar({ isAdmin = false, proposalsBadge = 0 }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [profileHref, setProfileHref] = useState<string>("/settings");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setAvatarUrl(user.user_metadata?.avatar_url ?? null);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        setUsername(profile?.username ?? "Usuário");
        if (profile?.username) {
          setProfileHref(`/p/${profile.username}`);
        }
      }
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
      <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <MarkFU size={28} />
            <span
              className="text-base text-white hidden sm:block"
              style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
            >
              falta<span className="text-yellow-400">Uma</span>
            </span>
          </Link>

          <div className="ml-2 mr-auto">
            <AlbumSelector />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-green-600/20 text-green-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  {link.href === "/players/proposals" && proposalsBadge > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-bold text-white">
                      {proposalsBadge > 9 ? "9+" : proposalsBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side: profile menu */}
          <div className="relative flex items-center gap-3" ref={menuRef}>
            {/* Badge indicator */}
            {proposalsBadge > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">
                  {proposalsBadge} {proposalsBadge === 1 ? "proposta" : "propostas"}
                </span>
              </div>
            )}

            {/* User name - desktop */}
            <span className="hidden lg:block text-sm text-gray-400">
              {username}
            </span>

            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full ring-2 ring-white/10 hover:ring-green-500/50 transition-all"
              aria-label="Menu do usuário"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white font-medium">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                style={{ transformOrigin: 'top right' }}
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-medium text-white truncate">{username}</p>
                  <Link
                    href={profileHref}
                    onClick={() => setMenuOpen(false)}
                    className="text-xs text-gray-400 hover:text-green-400 transition-colors flex items-center gap-1 mt-0.5"
                  >
                    <User className="h-3 w-3" />
                    Ver perfil
                  </Link>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); setContactOpen(true); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Fale conosco
                  </button>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Painel Admin
                    </Link>
                  )}
                  <Link
                    href="/albums"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    Meus álbuns
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                </div>

                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Fale conosco
            </DialogTitle>
          </DialogHeader>
          <ContactForm onSuccess={() => setContactOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
