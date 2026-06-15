import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: unseenCount } = await supabase.rpc("count_unseen_proposals");
  const proposalsBadge = (unseenCount as number | null) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-green-950 flex flex-col">
      <TopBar isAdmin={!!admin} proposalsBadge={proposalsBadge} />
      <main className="flex-1 w-full pb-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>
      <BottomNav proposalsBadge={proposalsBadge} />
    </div>
  );
}
