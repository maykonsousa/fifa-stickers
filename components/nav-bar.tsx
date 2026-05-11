"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Grid3X3, Users, Repeat2, User, LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Álbum", icon: LayoutDashboard },
  { href: "/collection", label: "Coleção", icon: Grid3X3 },
  { href: "/friends", label: "Amigos", icon: Users },
  { href: "/trades", label: "Trocas", icon: Repeat2 },
  { href: "/profile", label: "Perfil", icon: User },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-bold text-white">
          FIFA{" "}
          <span className="bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
            2026
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
          <button
            onClick={handleLogout}
            className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
        <MobileMenu pathname={pathname} onLogout={handleLogout} />
      </div>
    </nav>
  );
}

function MobileMenu({ pathname, onLogout }: { pathname: string; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto sm:hidden">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-green-600/20 text-green-400"
                : "text-gray-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={onLogout}
        className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
