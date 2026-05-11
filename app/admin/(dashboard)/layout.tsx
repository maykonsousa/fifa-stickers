import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="text-lg font-bold text-green-400">
            Admin — FIFA 2026
          </Link>
          <div className="flex items-center gap-1">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/stickers">Figurinhas</NavLink>
            <NavLink href="/admin/upload">Upload</NavLink>
            <NavLink href="/admin/users">Usuários</NavLink>
            <NavLink href="/admin/invites">Convites</NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
