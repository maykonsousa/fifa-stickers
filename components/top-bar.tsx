"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Settings, LogOut, Shield, User, MessageCircle, X } from "lucide-react";
import { MarkFU } from "./brand/Logo";
import { ContactForm } from "@/components/contact-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface TopBarProps {
  isAdmin?: boolean;
  proposalsBadge?: number;
}

export function TopBar({ isAdmin = false, proposalsBadge = 0 }: TopBarProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [username, setUsername] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAvatarUrl(user.user_metadata?.avatar_url ?? null);
        setUsername(user.user_metadata?.user_name ?? user.email?.split("@")[0] ?? "Usuário");
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

          {/* Right side: profile menu */}
          <div className="relative flex items-center gap-3" ref={menuRef}>
            {/* Badge indicator */}
            {proposalsBadge > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">
                  {proposalsBadge} {proposalsBadge === 1 ? "proposta" : "propostas"}
                </span>
              </div>
            )}

            {/* User name - desktop */}
            <span className="hidden md:block text-sm text-gray-400">
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
                    href={`/p/${username}`}
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
