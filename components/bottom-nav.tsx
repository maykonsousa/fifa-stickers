"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, QrCode, Repeat2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/collection", label: "Coleção", icon: Grid3X3 },
  { href: "/collection/scanner", label: "Scanner", icon: QrCode, isCenter: true },
  { href: "/players", label: "Trocas", icon: Repeat2 },
];

interface BottomNavProps {
  proposalsBadge?: number;
}

export function BottomNav({ proposalsBadge = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const [profileHref, setProfileHref] = useState("/settings");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (profile?.username) {
          setProfileHref(`/p/${profile.username}`);
        }
      }
    });
  }, []);

  const isActive = (href: string) => {
    if (href === "/collection") {
      return pathname === "/collection";
    }
    if (href === "/collection/scanner") {
      return pathname === "/collection/scanner";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isProfileActive = pathname.startsWith("/p/");

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 overflow-visible md:hidden",
        "bg-gray-900/95 backdrop-blur-xl",
        "border-t border-white/10",
        "safe-area-bottom"
      )}
    >
      {/* Mobile bottom navigation only */}
      <div className="relative flex items-end justify-between h-16 px-4 pb-1">
        {/* Left side: Home + Coleção */}
        <div className="flex items-end justify-between w-36">
          {navItems
            .filter((item) => !item.isCenter)
            .slice(0, 2)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-end gap-0.5 py-2 transition-all",
                    active
                      ? "text-green-400"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                  <span className={cn(
                    "text-[10px] font-medium transition-all",
                    active ? "font-semibold" : "font-normal"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
        </div>

        {/* Scanner - absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-4 flex items-center justify-center">
          {navItems
            .filter((item) => item.isCenter)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center",
                    "w-12 h-12 rounded-full",
                    active
                      ? "bg-green-600 text-white"
                      : "bg-gray-900 text-white",
                    "border-[2px]",
                    active ? "border-green-500" : "border-gray-900",
                    "hover:scale-110",
                    "active:scale-95 transition-all duration-200"
                  )}
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              );
            })}
        </div>

        {/* Right side: Trocas + Perfil */}
        <div className="flex items-end justify-between w-36">
          {/* Trocas */}
          {navItems
            .filter((item) => !item.isCenter && item.href === "/players")
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-end gap-0.5 py-2 transition-all",
                    active
                      ? "text-green-400"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                  <span className={cn(
                    "text-[10px] font-medium transition-all",
                    active ? "font-semibold" : "font-normal"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

          {/* Profile */}
          <Link
            href={profileHref}
            className={cn(
              "flex flex-col items-center justify-end gap-0.5 py-2 transition-all",
              isProfileActive
                ? "text-green-400"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <User className={cn("h-5 w-5 transition-transform", isProfileActive && "scale-110")} strokeWidth={isProfileActive ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] font-medium transition-all",
              isProfileActive ? "font-semibold" : "font-normal"
            )}>
              Perfil
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
