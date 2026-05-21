import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicHeader } from "./public-header";
import { NavBar } from "@/components/nav-bar";
import { ProfileHero } from "./profile-hero";
import { ProfileStickers } from "./profile-stickers";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("username", username)
    .single();

  if (!profile) {
    return { title: "Perfil não encontrado — faltaUma" };
  }

  const title = `${profile.display_name} (@${profile.username}) — faltaUma`;
  const description = `Veja o álbum de figurinhas de ${profile.display_name}. Confira quais figurinhas faltam e quais estão disponíveis para troca.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://faltauma.com/p/${profile.username}`,
      siteName: "faltaUma",
      locale: "pt_BR",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username, city, state, instagram, whatsapp, share_instagram, share_whatsapp")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code")
    .order("id");

  const isOwnProfile = user?.id === profile.id;
  const tradeUIEnabled = !isOwnProfile;
  const tradeFilterActive = !!user && !isOwnProfile;
  const isLoggedIn = !!user;
  const viewerId: string | null = tradeFilterActive && user ? user.id : null;

  const { data: statsRows } = await supabase.rpc("get_profile_view_stats", {
    p_user_id: profile.id,
    p_viewer_id: viewerId,
  });
  const stats = statsRows?.[0] ?? {
    total_stickers: 0,
    owner_unique_owned: 0,
    owner_total_duplicates: 0,
    trade_duplicates_count: null,
  };

  const total = Number(stats.total_stickers);
  const uniqueOwned = Number(stats.owner_unique_owned);
  const totalDuplicates = Number(stats.owner_total_duplicates);
  const totalMissing = total - uniqueOwned;
  const percent = total > 0 ? Math.round((uniqueOwned / total) * 100) : 0;
  const ownerHasTradeable = totalDuplicates > 0 && totalMissing > 0;
  const tradeDuplicatesCount: number | null =
    stats.trade_duplicates_count === null || stats.trade_duplicates_count === undefined
      ? null
      : Number(stats.trade_duplicates_count);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-green-950 text-white">
      {user ? <NavBar /> : <PublicHeader />}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ProfileHero
          displayName={profile.display_name}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          city={profile.city}
          state={profile.state}
          instagram={profile.instagram}
          whatsapp={profile.whatsapp}
          shareInstagram={profile.share_instagram}
          shareWhatsapp={profile.share_whatsapp}
          totalOwned={uniqueOwned}
          totalMissing={totalMissing}
          totalDuplicates={totalDuplicates}
          totalStickers={total}
          percent={percent}
        />
        <ProfileStickers
          userId={profile.id}
          viewerId={viewerId}
          tradeUIEnabled={tradeUIEnabled}
          tradeFilterActive={tradeFilterActive}
          isLoggedIn={isLoggedIn}
          ownerUsername={profile.username}
          ownerHasTradeable={ownerHasTradeable}
          groups={groups ?? []}
          missingCount={totalMissing}
          duplicatesCount={totalDuplicates}
          tradeDuplicatesCount={tradeDuplicatesCount}
        />
      </div>
    </div>
  );
}
