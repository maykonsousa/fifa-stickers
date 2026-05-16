import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalBuilder } from "./proposal-builder";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  if (!to) {
    redirect("/proposals");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: owner } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", to)
    .single();

  if (!owner || owner.id === user!.id) {
    redirect("/proposals");
  }

  // Coleção do viewer pra sinalização visual no picker
  const { data: viewerStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", user!.id);

  const viewerOwnedCounts: Record<number, number> = {};
  for (const vs of viewerStickers ?? []) {
    viewerOwnedCounts[vs.sticker_id] = (viewerOwnedCounts[vs.sticker_id] ?? 0) + 1;
  }

  return (
    <ProposalBuilder
      ownerUserId={owner.id}
      ownerDisplayName={owner.display_name ?? "Colecionador"}
      ownerUsername={owner.username}
      viewerUserId={user!.id}
      viewerOwnedCounts={viewerOwnedCounts}
    />
  );
}
