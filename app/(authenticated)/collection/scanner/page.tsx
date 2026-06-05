import { createClient } from "@/lib/supabase/server";
import { ScannerView } from "./scanner-view";

export default async function ScannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <ScannerView userId={user!.id} />;
}
