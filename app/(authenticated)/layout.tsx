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

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-green-950 flex flex-col">
      <NavBar isAdmin={!!admin} />
      <main className="mx-auto max-w-6xl px-4 py-6 flex-1 w-full">
        {children}
      </main>
      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Produzido por{' '}
        <a href="https://www.linkedin.com/in/maykonsousa/" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Maykon Sousa</a>
        {' '}e{' '}
        <a href="https://www.linkedin.com/in/brunasousasantos/" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Bruna Sousa</a>
        {' '}· 🇧🇷
      </footer>
    </div>
  );
}
