"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserMatchMember {
  kind: "member";
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

export interface UserMatchLead {
  kind: "lead";
  id: string;
  display_name: string;
  email: string;
}

export type UserMatch = UserMatchMember | UserMatchLead;

const LIKE_SPECIAL = /[%_\\]/g;

export async function searchUsers(keyword: string): Promise<UserMatch[]> {
  const trimmed = keyword.trim();
  if (trimmed.length < 4) return [];

  // Escapa wildcards de ILIKE — a RPC usa LIKE com '%' || kw || '%'.
  const escaped = trimmed.replace(LIKE_SPECIAL, "\\$&");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_users", {
    p_keyword: escaped,
    p_limit: 10,
    p_include_leads: true,
  });

  if (error) {
    console.error("searchUsers error", error);
    return [];
  }

  const rows = (data ?? []) as {
    kind: "member" | "lead";
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
  }[];

  return rows.map((r) =>
    r.kind === "member"
      ? {
          kind: "member",
          id: r.id,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
          email: r.email,
        }
      : {
          kind: "lead",
          id: r.id,
          display_name: r.display_name,
          email: r.email,
        },
  );
}
