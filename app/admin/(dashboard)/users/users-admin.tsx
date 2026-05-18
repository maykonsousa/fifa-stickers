"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { formatDate } from "@/lib/format-datetime";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  username: string | null;
  sticker_count: number;
}

type SortField = "created_at" | "display_name" | "sticker_count";
type SortDir = "asc" | "desc";

interface Props {
  profiles: Profile[];
  adminUserIds: string[];
  page: number;
  totalPages: number;
  sort: SortField;
  dir: SortDir;
}

export function UsersAdmin({ profiles, adminUserIds, page, totalPages, sort, dir }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [promoting, setPromoting] = useState(false);
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      sp.set(k, v);
    }
    return `/admin/users?${sp.toString()}`;
  }

  function handleSort(field: SortField) {
    const newDir = sort === field && dir === "desc" ? "asc" : "desc";
    router.push(buildUrl({ sort: field, dir: newDir, page: "1" }));
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-500" />;
    return dir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-green-400" />
      : <ChevronDown className="h-3.5 w-3.5 text-green-400" />;
  }

  const handlePromote = (profile: Profile) => {
    setTargetUser(profile);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
    setTargetUser(null);
  };

  const handleConfirm = async () => {
    if (!targetUser) return;
    setPromoting(true);
    const supabase = createClient();
    await supabase.from("admins").insert({ user_id: targetUser.id });
    setPromoting(false);
    handleClose();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Usuários</h1>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {profiles.map((profile) => {
          const isAdmin = adminUserIds.includes(profile.id);
          return (
            <div key={profile.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 text-sm font-bold text-white">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/p/${profile.username}`} className="text-sm font-medium text-white truncate hover:text-green-400 transition-colors">
                      {profile.display_name}
                    </Link>
                    {isAdmin && (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-300">Admin</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {[profile.city, profile.state].filter(Boolean).join(", ") || "Sem localização"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500">
                    {formatDate(profile.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile.sticker_count} figurinhas
                  </p>
                </div>
                {!isAdmin && (
                  <button
                    onClick={() => handlePromote(profile)}
                    className="rounded-md bg-green-600/20 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 transition-colors"
                  >
                    Tornar Admin
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3">
                <button onClick={() => handleSort("display_name")} className="flex items-center gap-1 hover:text-white transition-colors">
                  Usuário <SortIcon field="display_name" />
                </button>
              </th>
              <th className="px-4 py-3">Cidade/UF</th>
              <th className="px-4 py-3">
                <button onClick={() => handleSort("sticker_count")} className="flex items-center gap-1 hover:text-white transition-colors">
                  Figurinhas <SortIcon field="sticker_count" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => handleSort("created_at")} className="flex items-center gap-1 hover:text-white transition-colors">
                  Cadastro <SortIcon field="created_at" />
                </button>
              </th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {profiles.map((profile) => {
              const isAdmin = adminUserIds.includes(profile.id);
              return (
                <tr key={profile.id} className="bg-gray-800/50 hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-white">
                          {profile.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <Link href={`/p/${profile.username}`} className="text-white hover:text-green-400 transition-colors flex items-center gap-1.5">
                        {profile.display_name}
                        <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                      </Link>
                      {isAdmin && (
                        <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">Admin</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {[profile.city, profile.state].filter(Boolean).join("/") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{profile.sticker_count}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">Admin</span>
                    ) : (
                      <button
                        onClick={() => handlePromote(profile)}
                        className="rounded-md bg-green-600/20 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 transition-colors"
                      >
                        Tornar Admin
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={buildUrl({ page: String(Math.max(1, page - 1)) })}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              page === 1
                ? "pointer-events-none text-gray-600"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            aria-disabled={page === 1}
          >
            Anterior
          </Link>
          <span className="text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <Link
            href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              page === totalPages
                ? "pointer-events-none text-gray-600"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            aria-disabled={page === totalPages}
          >
            Próxima
          </Link>
        </div>
      )}

      {/* Confirmation dialog */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto w-full max-w-sm rounded-xl bg-gray-800 p-0 text-white backdrop:bg-black/60"
        onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
      >
        {targetUser && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold">Confirmar promoção</h2>
            <p className="text-sm text-gray-300">
              Tem certeza que deseja tornar <span className="font-medium text-white">{targetUser.display_name}</span> admin?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirm}
                disabled={promoting}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {promoting ? "Promovendo..." : "Confirmar"}
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
