import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface ProfileWithContact {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .rpc("get_profile_with_contact", { viewer: user!.id, target: id })
    .single();

  const profile = data as unknown as ProfileWithContact | null;

  if (!profile) {
    notFound();
  }

  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", id);

  const { data: totalStickers } = await supabase
    .from("stickers")
    .select("id", { count: "exact", head: true });

  const uniqueOwned = new Set(userStickers?.map((s) => s.sticker_id)).size;
  const total = totalStickers?.length ?? 985;
  const percent = total > 0 ? Math.round((uniqueOwned / total) * 100) : 0;

  const { data: friendship } = await supabase
    .from("friends")
    .select("status")
    .eq("user_id", user!.id)
    .eq("friend_id", id)
    .single();

  const { data: pendingInvite } = await supabase
    .from("friend_invites")
    .select("id, status")
    .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user!.id})`)
    .eq("status", "pending")
    .single();

  const isFriend = friendship?.status === "active";
  const isOwnProfile = user!.id === id;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="h-16 w-16 rounded-full" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
          {profile.city && profile.state && (
            <p className="text-sm text-gray-500">{profile.city}, {profile.state}</p>
          )}
        </div>
      </div>

      {/* Album progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">Progresso do álbum</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-semibold text-gray-900">{percent}%</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{uniqueOwned} de {total} figurinhas</p>
      </div>

      {/* Contact info (friends only) */}
      {isFriend && (profile.instagram || profile.whatsapp) && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">Contato</p>
          <div className="mt-2 space-y-1">
            {profile.instagram && (
              <p className="text-sm text-gray-700">Instagram: {profile.instagram}</p>
            )}
            {profile.whatsapp && (
              <p className="text-sm text-gray-700">WhatsApp: {profile.whatsapp}</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {!isOwnProfile && (
        <div>
          {isFriend ? (
            <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700">
              Amigos
            </span>
          ) : pendingInvite ? (
            <span className="inline-flex items-center rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700">
              Convite pendente
            </span>
          ) : (
            <AddFriendButton userId={user!.id} targetId={id} />
          )}
        </div>
      )}

      <Link href="/friends" className="inline-block text-sm text-green-600 hover:underline">
        ← Voltar para amigos
      </Link>
    </div>
  );
}

function AddFriendButton({ userId, targetId }: { userId: string; targetId: string }) {
  return (
    <form action={async () => {
      "use server";
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.from("friend_invites").insert({
        sender_id: userId,
        receiver_id: targetId,
      });
    }}>
      <button
        type="submit"
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
      >
        Adicionar amigo
      </button>
    </form>
  );
}
