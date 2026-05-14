"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Image, Upload, Users, ArrowLeft } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/stickers", label: "Figurinhas", icon: Image },
  { href: "/admin/upload", label: "Upload", icon: Upload },
  { href: "/admin/users", label: "Usuários", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="text-lg font-bold text-green-400">
            Admin — FIFA 2026
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-green-600/20 text-green-400"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/"
              className="ml-2 flex items-center gap-1 rounded-md border border-gray-600 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Álbum
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors sm:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] sm:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileOpen(false)} />

          <div className="absolute top-0 right-0 bottom-0 w-64 flex flex-col bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="text-sm font-bold text-green-400">Admin</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
              {adminLinks.map((link) => {
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
              <hr className="my-2 border-gray-700" />
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Voltar ao Álbum
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
