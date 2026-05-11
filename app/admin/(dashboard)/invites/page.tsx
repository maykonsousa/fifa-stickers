import { createClient } from "@/lib/supabase/server";
import { InvitesAdmin } from "./invites-admin";

export default async function AdminInvitesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const { data: invites } = await supabase
    .from("admin_invites")
    .select("id, email, token, used_at, expires_at, created_at")
    .order("created_at", { ascending: false });

  return <InvitesAdmin adminId={admin!.id} invites={invites ?? []} />;
}
