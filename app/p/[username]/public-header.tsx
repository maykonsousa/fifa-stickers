"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MarkFU } from "@/components/brand/Logo";

export function PublicHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  if (isLoggedIn === null || isLoggedIn) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <MarkFU size={32} />
          <span
            className="text-lg text-white"
            style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', letterSpacing: '-0.5px' }}
          >
            falta<span className="text-yellow-400">Uma</span>
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-300 transition-colors"
          style={{ fontFamily: '"Archivo Black", "Arial Black", system-ui, sans-serif', fontSize: 12, letterSpacing: 0.5 }}
        >
          COMEÇAR AGORA
        </Link>
      </div>
    </header>
  );
}
