"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateStickerInput = {
  groupId: number;
  code: string;
  number: number;
  title?: string;
  description?: string;
};

export type CreateStickerResult =
  | { data: { id: number; code: string }; error: null }
  | { data: null; error: "unauthorized" | "duplicate_code" | "invalid_input" | "unknown" };

export async function createSticker(input: CreateStickerInput): Promise<CreateStickerResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "unauthorized" };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!admin) {
    return { data: null, error: "unauthorized" };
  }

  const code = input.code.trim().toUpperCase();
  const number = Number(input.number);

  if (
    !Number.isInteger(input.groupId) ||
    input.groupId <= 0 ||
    code.length === 0 ||
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return { data: null, error: "invalid_input" };
  }

  const { data: group } = await supabase
    .from("sticker_groups")
    .select("id")
    .eq("id", input.groupId)
    .single();
  if (!group) {
    return { data: null, error: "invalid_input" };
  }

  const title = input.title?.trim() || null;
  const description = input.description?.trim() || null;

  const { data: inserted, error: insertError } = await supabase
    .from("stickers")
    .insert({
      group_id: input.groupId,
      code,
      number,
      title,
      description,
    })
    .select("id, code")
    .single();

  if (insertError) {
    // 23505 = unique_violation. Today `stickers` only has UNIQUE on `code`,
    // but match on the constraint name explicitly so a future UNIQUE
    // constraint (e.g., (group_id, number)) cannot get silently mislabelled.
    if (
      insertError.code === "23505" &&
      (insertError.message?.includes("stickers_code_key") ||
        insertError.details?.includes("(code)"))
    ) {
      return { data: null, error: "duplicate_code" };
    }
    console.error("createSticker insert failed:", insertError);
    return { data: null, error: "unknown" };
  }

  const { error: counterError } = await supabase.rpc("increment_sticker_group_count", {
    p_group_id: input.groupId,
  });

  if (counterError) {
    console.error("createSticker counter increment failed:", counterError);
    // Sticker was created; counter drift is recoverable, do not fail the request.
  }

  return { data: { id: inserted.id, code: inserted.code }, error: null };
}
