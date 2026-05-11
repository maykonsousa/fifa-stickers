import { createClient } from "@/lib/supabase/server";
import { FriendsView } from "./friends-view";

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: friends } = await supabase
    .from("friends")
    .select("id, friend_id, status, profiles!friends_friend_id_fkey(display_name, avatar_url, city, state)")
    .eq("user_id", user!.id);

  const { data: pendingInvites } = await supabase
    .from("friend_invites")
    .select("id, sender_id, profiles!friend_invites_sender_id_fkey(display_name, avatar_url, city, state)")
    .eq("receiver_id", user!.id)
    .eq("status", "pending");

  const { data: sentInvites } = await supabase
    .from("friend_invites")
    .select("id, receiver_id, status, profiles!friend_invites_receiver_id_fkey(display_name, avatar_url)")
    .eq("sender_id", user!.id)
    .eq("status", "pending");

  return (
    <FriendsView
      userId={user!.id}
      friends={(friends ?? []) as any}
      pendingInvites={(pendingInvites ?? []) as any}
      sentInvites={(sentInvites ?? []) as any}
    />
  );
}
