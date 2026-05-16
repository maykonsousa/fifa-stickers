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

  // Trade intersection stats — only when a different logged-in viewer is looking.
  const isOwnProfile = user?.id === profile.id;
  const tradeFilterActive = !!user && !isOwnProfile;

  let viewerId: string | null = null;
  let tradeMissingCount: number | null = null;
  let tradeDuplicatesCount: number | null = null;

  if (tradeFilterActive && user) {
    viewerId = user.id;

    const { data: viewerStickers } = await supabase
      .from("user_stickers")
      .select("sticker_id")
      .eq("user_id", user.id);

    const viewerCount = new Map<number, number>();
    for (const vs of viewerStickers ?? []) {
      viewerCount.set(vs.sticker_id, (viewerCount.get(vs.sticker_id) ?? 0) + 1);
    }
    const viewerDupes = new Set<number>();
    for (const [id, c] of viewerCount) {
      if (c > 1) viewerDupes.add(id);
    }

    // Faltam pro dono que o viewer tem repetida
    let missingMatch = 0;
    for (const id of viewerDupes) {
      if (!ownerOwned.has(id)) missingMatch++;
    }
    tradeMissingCount = missingMatch;

    // Repetidas do dono que o viewer não tem
    let dupesMatch = 0;
    for (const id of ownerDupes) {
      if (!viewerCount.has(id)) dupesMatch++;
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
          tradeFilterActive={tradeFilterActive}
          ownerUsername={profile.username}
          groups={groups ?? []}
          missingCount={totalMissing}
          duplicatesCount={totalDuplicates}
          tradeMissingCount={tradeMissingCount}
          tradeDuplicatesCount={tradeDuplicatesCount}
        />
      </div>
    </div>
  );
}
