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

  // Stats — owner's totals (always computed for the hero).
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", profile.id);

  const { count: totalStickers } = await supabase
    .from("stickers")
    .select("id", { count: "exact", head: true });

  const ownerOwned = new Set<number>();
  const ownerDupes = new Set<number>();
  for (const us of userStickers ?? []) {
    if (ownerOwned.has(us.sticker_id)) ownerDupes.add(us.sticker_id);
    ownerOwned.add(us.sticker_id);
  }

  const uniqueOwned = ownerOwned.size;
  const total = totalStickers ?? 0;
  const totalMissing = total - uniqueOwned;
  const totalDuplicates = ownerDupes.size;
  const percent = total > 0 ? Math.round((uniqueOwned / total) * 100) : 0;
  const ownerHasTradeable = ownerDupes.size > 0 && totalMissing > 0;

  // Trade UI: visible to any visitor who isn't the owner (logged or not).
  // Intersection filter: only when a *logged* viewer is looking.
  const isOwnProfile = user?.id === profile.id;
  const tradeUIEnabled = !isOwnProfile;
  const tradeFilterActive = !!user && !isOwnProfile;
  const isLoggedIn = !!user;

  let viewerId: string | null = null;
  let tradeDuplicatesCount: number | null = null;
  const viewerOwnedCounts: Record<number, number> = {};

  if (tradeFilterActive && user) {
    viewerId = user.id;

    const { data: viewerStickers } = await supabase
      .from("user_stickers")
      .select("sticker_id")
      .eq("user_id", user.id);

    const viewerOwned = new Set<number>();
    for (const vs of viewerStickers ?? []) {
      viewerOwned.add(vs.sticker_id);
      viewerOwnedCounts[vs.sticker_id] = (viewerOwnedCounts[vs.sticker_id] ?? 0) + 1;
    }

    // Repetidas do dono que o viewer não tem (universo viável para wants)
    let dupesMatch = 0;
    for (const id of ownerDupes) {
      if (!viewerOwned.has(id)) dupesMatch++;
    }
    tradeDuplicatesCount = dupesMatch;
  }

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
          viewerOwnedCounts={viewerOwnedCounts}
        />
      </div>
    </div>
  );
}
