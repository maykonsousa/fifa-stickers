import { createClient } from "@/lib/supabase/server";
import { TradesView } from "./trades-view";

export default async function TradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: matches } = await supabase
    .rpc("get_trade_matches", { current_user_id: user!.id });

  return <TradesView matches={matches ?? []} userId={user!.id} />;
}
