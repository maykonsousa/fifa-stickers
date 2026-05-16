import { createClient } from "@/lib/supabase/server";
import { NewTradeWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto">
      <NewTradeWizard initiatorUserId={user!.id} />
    </div>
  );
}
