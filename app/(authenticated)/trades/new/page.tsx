import { createClient } from "@/lib/supabase/server";
import { NewTradeWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto">
      <NewTradeWizard
        initiatorUserId={user!.id}
        initiatorName={profile?.display_name ?? "Você"}
      />
    </div>
  );
}
