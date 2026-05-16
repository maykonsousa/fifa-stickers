"use server";

import { createClient } from "@/lib/supabase/server";

export async function markAllTradesAsSeen() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_trades_as_seen");
  if (error) {
    console.error("markAllTradesAsSeen error", error);
  }
}
