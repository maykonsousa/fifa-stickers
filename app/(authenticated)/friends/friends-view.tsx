"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface FriendRow {
  id: string;
  friend_id: string;
  status: string;
  profiles: { display_name: string; avatar_url: string | null; city: string | null; state: string | null };
}

interface PendingInvite {
  id: string;
  sender_id: string;
  profiles: { display_name: string; avatar_url: string | null; city: string | null; state: string | null };
}

interface SentInvite {
  id: string;
  receiver_id: string;
  status: string;
  profiles: { display_name: string; avatar_url: string | null };
}

export function FriendsView({
  userId,
  friends,
  pendingInvites,
  sentInvites,
}: {
  userId: string;
  friends: FriendRow[];
  pendingInvites: PendingInvite[];
  sentInvites: SentInvite[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; avatar_url: string | null; city: string | null; state: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeFriends = friends.filter((f) => f.status === "active");
  const blockedFriends = friends.filter((f) => f.status === "blocked");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, city, state")
      .ilike("display_name", `%${searchQuery}%`)
      .neq("id", userId)
      .limit(10);
    setSearchResults(data ?? []);
    setSearching(false);
  };

  const handleSendInvite = async (receiverId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("friend_invites").insert({
      sender_id: userId,
      receiver_id: receiverId,
    });
    router.refresh();
    setLoading(false);
  };

  const handleAccept = async (inviteId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("accept_friend_invite", { invite_id: inviteId });
    router.refresh();
    setLoading(false);
  };

  const handleReject = async (inviteId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("friend_invites")
      .update({ status: "rejected" })
      .eq("id", inviteId);
    router.refresh();
    setLoading(false);
  };

  const handleBlock = async (friendId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("block_friend", { target_id: friendId });
    router.refresh();
    setLoading(false);
  };

  const handleUnblock = async (friendId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("unblock_friend", { target_id: friendId });
    router.refresh();
    setLoading(false);
  };

  const handleRemove = async (friendId: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("remove_friend", { target_id: friendId });
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Amigos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gerencie seus amigos e envie convites.
        </p>
      </div>

      {/* Search users */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Buscar usuários</h2>
        <form onSubmit={handleSearch} className="mt-2 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Buscar
          </button>
        </form>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((user) => {
              const alreadyFriend = friends.some((f) => f.friend_id === user.id && f.status === "active");
              const alreadyInvited = sentInvites.some((i) => i.receiver_id === user.id);
              return (
                <div key={user.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar url={user.avatar_url} name={user.display_name} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                      {user.city && user.state && (
                        <p className="text-xs text-gray-500">{user.city}, {user.state}</p>
                      )}
                    </div>
                  </div>
                  {alreadyFriend ? (
                    <span className="text-xs text-green-600 font-medium">Amigos</span>
                  ) : alreadyInvited ? (
                    <span className="text-xs text-gray-500">Convite enviado</span>
                  ) : (
                    <button
                      onClick={() => handleSendInvite(user.id)}
                      disabled={loading}
                      className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                    >
                      Convidar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Convites recebidos ({pendingInvites.length})
          </h2>
          <div className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                <div className="flex items-center gap-3">
                  <Avatar url={invite.profiles.avatar_url} name={invite.profiles.display_name} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.profiles.display_name}</p>
                    {invite.profiles.city && invite.profiles.state && (
                      <p className="text-xs text-gray-500">{invite.profiles.city}, {invite.profiles.state}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={loading}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleReject(invite.id)}
                    disabled={loading}
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active friends */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Meus amigos ({activeFriends.length})
        </h2>
        {activeFriends.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nenhum amigo ainda. Busque e convide!</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar url={friend.profiles.avatar_url} name={friend.profiles.display_name} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{friend.profiles.display_name}</p>
                    {friend.profiles.city && friend.profiles.state && (
                      <p className="text-xs text-gray-500">{friend.profiles.city}, {friend.profiles.state}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRemove(friend.friend_id)}
                    disabled={loading}
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Remover
                  </button>
                  <button
                    onClick={() => handleBlock(friend.friend_id)}
                    disabled={loading}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    Bloquear
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked */}
      {blockedFriends.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Bloqueados ({blockedFriends.length})
          </h2>
          <div className="mt-3 space-y-2">
            {blockedFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar url={friend.profiles.avatar_url} name={friend.profiles.display_name} />
                  <p className="text-sm font-medium text-gray-900">{friend.profiles.display_name}</p>
                </div>
                <button
                  onClick={() => handleUnblock(friend.friend_id)}
                  disabled={loading}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} className="h-9 w-9 rounded-full" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
