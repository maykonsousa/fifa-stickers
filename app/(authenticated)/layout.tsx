import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
