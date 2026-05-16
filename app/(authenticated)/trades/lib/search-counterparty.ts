"use server";

import { createClient } from "@/lib/supabase/server";

interface FoundMember {
  kind: "member";
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

interface FoundLead {
  kind: "lead";
  id: string;
  name: string;
  email: string;
}

export type CounterpartyMatch = FoundMember | FoundLead;

export async function searchCounterpartyByEmail(
  email: string,
): Promise<CounterpartyMatch | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("find_counterparty_by_email", { p_email: trimmed })
    .maybeSingle();

  if (error) {
    console.error("searchCounterpartyByEmail error", error);
    return null;
  }

  if (!data) return null;

  const row = data as unknown as {
    kind: "member" | "lead";
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
  };

  if (row.kind === "member") {
    return {
      kind: "member",
      id: row.id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      email: row.email,
    };
  }

  return {
    kind: "lead",
    id: row.id,
    name: row.display_name,
    email: row.email,
  };
}
