"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Álbum" },
  { href: "/collection", label: "Coleção" },
  { href: "/friends", label: "Amigos" },
  { href: "/trades", label: "Trocas" },
  { href: "/profile", label: "Perfil" },
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
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-bold text-green-700">
          FIFA 2026
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
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
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            pathname === link.href
              ? "bg-green-50 text-green-700"
              : "text-gray-600"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={onLogout}
        className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600"
      >
        Sair
      </button>
    </div>
  );
}
