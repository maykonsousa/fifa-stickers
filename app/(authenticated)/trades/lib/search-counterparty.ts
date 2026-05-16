"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchCounterpartyByEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("find_user_by_email", { p_email: trimmed })
    .maybeSingle();

  if (error) {
    console.error("searchCounterpartyByEmail error", error);
    return null;
  }

  if (!data) return null;

  const row = data as unknown as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
  };

  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    email: row.email,
  };
}
