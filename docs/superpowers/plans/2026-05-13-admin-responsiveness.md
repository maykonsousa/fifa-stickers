# Admin Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin layout and routes fully responsive on mobile — hamburger nav + card layouts for tables.

**Architecture:** Extract admin nav into a client component with mobile drawer (matching existing NavBar pattern). Add mobile card views alongside existing tables using responsive visibility classes.

**Tech Stack:** Next.js, React, Tailwind CSS, lucide-react icons

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `components/admin/AdminNav.tsx` | Client component: admin nav bar with mobile drawer |
| Modify | `app/admin/(dashboard)/layout.tsx` | Server component: auth guard + renders AdminNav + children |
| Modify | `app/admin/(dashboard)/users/page.tsx` | Add mobile card view alongside table |
| Modify | `app/admin/(dashboard)/invites/invites-admin.tsx` | Add mobile card view alongside table |

---

### Task 1: Create AdminNav Client Component

**Files:**
- Create: `components/admin/AdminNav.tsx`

- [ ] **Step 1: Create the AdminNav component**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Image, Upload, Users, Mail } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/stickers", label: "Figurinhas", icon: Image },
  { href: "/admin/upload", label: "Upload", icon: Upload },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/invites", label: "Convites", icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="text-lg font-bold text-green-400">
            Admin — FIFA 2026
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-green-600/20 text-green-400"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors sm:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] sm:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileOpen(false)} />

          <div className="absolute top-0 right-0 bottom-0 w-64 flex flex-col bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="text-sm font-bold text-green-400">Admin</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-600/20 text-green-400"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx next build --no-lint 2>&1 | head -20` or start dev server and check for errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminNav.tsx
git commit -m "feat(admin): add responsive AdminNav component with mobile drawer"
```

---

### Task 2: Update Admin Layout to Use AdminNav

**Files:**
- Modify: `app/admin/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace inline nav with AdminNav import**

Replace the entire file content with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

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
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server loads admin pages without errors**

Run: open `/admin` in browser, confirm nav renders on desktop and hamburger appears on mobile viewport.

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(dashboard\)/layout.tsx
git commit -m "refactor(admin): use AdminNav client component in layout"
```

---

### Task 3: Users Page — Mobile Card View

**Files:**
- Modify: `app/admin/(dashboard)/users/page.tsx`

- [ ] **Step 1: Add `hidden sm:block` to the existing table wrapper and add mobile cards**

Replace the return JSX with:

```tsx
return (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">Usuários</h1>

    {/* Mobile cards */}
    <div className="flex flex-col gap-3 sm:hidden">
      {profiles?.map((profile) => (
        <div key={profile.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 text-sm font-bold text-white">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.display_name}</p>
              <p className="text-xs text-gray-400">
                {[profile.city, profile.state].filter(Boolean).join(", ") || "Sem localização"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Cadastro: {new Date(profile.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ))}
    </div>

    {/* Desktop table */}
    <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="px-4 py-3">Usuário</th>
            <th className="px-4 py-3">Cidade</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Cadastro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {profiles?.map((profile) => (
            <tr key={profile.id} className="bg-gray-800/50 hover:bg-gray-700/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-white">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-white">{profile.display_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-400">{profile.city ?? "—"}</td>
              <td className="px-4 py-3 text-gray-400">{profile.state ?? "—"}</td>
              <td className="px-4 py-3 text-gray-400">
                {new Date(profile.created_at).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
```

- [ ] **Step 2: Verify in browser**

Open `/admin/users` — check table on desktop, cards on mobile viewport (< 640px).

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(dashboard\)/users/page.tsx
git commit -m "feat(admin): add mobile card layout for users page"
```

---

### Task 4: Invites Page — Mobile Card View

**Files:**
- Modify: `app/admin/(dashboard)/invites/invites-admin.tsx`

- [ ] **Step 1: Add mobile cards and hide table on mobile**

In the `InvitesAdmin` component, replace the invites list section (the `overflow-x-auto` div containing the table) with:

```tsx
{/* Mobile cards */}
<div className="flex flex-col gap-3 sm:hidden">
  {invites.map((invite) => {
    const isUsed = !!invite.used_at;
    const isExpired = new Date(invite.expires_at) < new Date();
    return (
      <div key={invite.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white truncate">{invite.email}</p>
          {isUsed ? (
            <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">Usado</span>
          ) : isExpired ? (
            <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">Expirado</span>
          ) : (
            <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">Pendente</span>
          )}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Expira: {new Date(invite.expires_at).toLocaleDateString("pt-BR")}</span>
          <span>Criado: {new Date(invite.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    );
  })}
</div>

{/* Desktop table */}
<div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-700">
  <table className="w-full text-sm text-left">
    <thead className="bg-gray-800 text-gray-400">
      <tr>
        <th className="px-4 py-3">Email</th>
        <th className="px-4 py-3">Status</th>
        <th className="px-4 py-3">Expira em</th>
        <th className="px-4 py-3">Criado em</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-700">
      {invites.map((invite) => {
        const isUsed = !!invite.used_at;
        const isExpired = new Date(invite.expires_at) < new Date();
        return (
          <tr key={invite.id} className="bg-gray-800/50">
            <td className="px-4 py-3 text-white">{invite.email}</td>
            <td className="px-4 py-3">
              {isUsed ? (
                <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-300">Usado</span>
              ) : isExpired ? (
                <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-300">Expirado</span>
              ) : (
                <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">Pendente</span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-400">
              {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
            </td>
            <td className="px-4 py-3 text-gray-400">
              {new Date(invite.created_at).toLocaleDateString("pt-BR")}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

- [ ] **Step 2: Verify in browser**

Open `/admin/invites` — check table on desktop, cards on mobile viewport (< 640px).

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(dashboard\)/invites/invites-admin.tsx
git commit -m "feat(admin): add mobile card layout for invites page"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Test all admin routes at mobile viewport**

Open each route in browser at 375px width:
- `/admin` — stats grid should stack (already works)
- `/admin/stickers` — grid already responsive
- `/admin/upload` — drop zone already responsive
- `/admin/users` — should show cards
- `/admin/invites` — should show cards
- Nav hamburger should work on all pages

- [ ] **Step 2: Test desktop viewport**

Confirm nothing changed at ≥ 640px — tables and horizontal nav still render.

- [ ] **Step 3: Final commit if any fixes needed, then push**

```bash
git push
```
