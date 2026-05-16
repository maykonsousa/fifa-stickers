"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addStickersToCollectionAction(stickerIds: number[]) {
  if (stickerIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_stickers_to_collection", {
    p_sticker_ids: stickerIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/collection");
  revalidatePath("/trades");
}
