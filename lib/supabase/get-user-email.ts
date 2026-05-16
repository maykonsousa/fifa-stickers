import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wrap supabase.rpc("get_user_email") with explicit error logging.
 * Returns the email or null. Callers must handle null to skip sending.
 */
export async function getUserEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_email", {
    p_user_id: userId,
  });

  if (error) {
    console.error("getUserEmail RPC error", { userId, error });
    return null;
  }

  if (!data) {
    console.warn("getUserEmail returned no email for user", { userId });
    return null;
  }

  return data as string;
}
