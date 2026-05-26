import { createClient } from "@/lib/supabase/server";
import { StickersAdmin } from "./stickers-admin";

export default async function AdminStickersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("sticker_groups")
    .select("id, name, code, type, sticker_count")
    .order("id");

  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, group_id, code, number, title, description, image_url, orientation")
    .order("group_id")
    .order("number");

  return (
    <StickersAdmin
      groups={groups ?? []}
      stickers={stickers ?? []}
      userId={user!.id}
    />
  );
}
