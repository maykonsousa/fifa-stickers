"use server";

import { createClient } from "@/lib/supabase/server";

export async function markSeenAction(proposalId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_proposal_seen", {
    p_proposal_id: proposalId,
  });
  if (error) {
    // não bloqueia o render — só loga
    console.error("markSeenAction failed", error);
  }
}
