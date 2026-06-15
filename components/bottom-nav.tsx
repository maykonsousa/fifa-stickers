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
  { href: "/players", label: "Colecionadores", icon: Repeat2 },
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
      <div className="relative flex items-end justify-around h-16 px-2 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.isCenter) {
            return (
              <div key="scanner" className="absolute left-1/2 -translate-x-1/2 -top-3 flex items-center justify-center">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center",
                    "w-10 h-10 rounded-full",
                    active
                      ? "bg-green-600 text-white"
                      : "bg-gray-900 text-white",
                    "border-[2px]",
                    active ? "border-green-500" : "border-gray-900",
                    "hover:scale-110",
                    "active:scale-95 transition-all duration-200"
                  )}
                  style={{
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-end gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]",
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

        {/* Profile button */}
        <Link
          href={profileHref}
          className={cn(
            "flex flex-col items-center justify-end gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]",
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
    </nav>
  );
}
