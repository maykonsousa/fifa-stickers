# Admin Add-Sticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "create sticker" flow to `/admin/stickers` — a `+` card on the grid opens a creation modal; on success, the existing `StickerImageUpload` component is opened for optional camera/gallery upload.

**Architecture:** Server Action handles the INSERT (admin-checked server-side); a new RLS migration permits admin-only INSERT on `stickers` and UPDATE on `sticker_groups`. The creation modal lives in a new sibling component to keep `stickers-admin.tsx` focused; after success, the existing image-upload modal is chained.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Supabase (SSR client, Postgres RLS), shadcn primitives (`dialog`, `popover`, `command`), `sonner` toasts.

**Spec:** `docs/superpowers/specs/2026-05-14-admin-add-sticker-design.md`

**Note on testing:** This project has **no test framework configured** (no `vitest`/`jest` in `package.json`). The plan does NOT use TDD — verification is via TypeScript build, ESLint, and explicit manual steps in the dev server. Do **not** add a test framework as part of this work.

---

## File Layout

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/025_admin_stickers_write.sql` | new | RLS policies allowing admin INSERT on `stickers` and UPDATE on `sticker_groups`. |
| `app/admin/(dashboard)/stickers/actions.ts` | new | Server Action `createSticker` with admin check + INSERT + counter increment. |
| `app/admin/(dashboard)/stickers/create-sticker-modal.tsx` | new | Client component owning the creation form. Renders the `<dialog>`, validates input, calls the action, and emits `onCreated({ id, code })`. |
| `app/admin/(dashboard)/stickers/stickers-admin.tsx` | modify | Adds the `+` card (page 1 only), holds state for create-modal and chained image-upload modal, prefills selected group, calls `router.refresh()` after image flow closes. |
| `app/admin/(dashboard)/stickers/page.tsx` | modify | Fetches the authenticated user id (needed by `StickerImageUpload`) and passes it as a prop. |

---

## Task 1: Add RLS migration for admin writes

**Files:**
- Create: `supabase/migrations/025_admin_stickers_write.sql`

- [ ] **Step 1: Confirm `024` is the highest existing migration**

Run: `ls supabase/migrations | sort | tail -3`
Expected output ends with:
```
023_public_stickers_add_title.sql
024_add_sticker_count_to_profiles.sql
```
If `025_*` already exists, STOP and ask the user — the plan assumes `025` is free.

- [ ] **Step 2: Create the migration file**

Write `supabase/migrations/025_admin_stickers_write.sql` with this exact content (policies **and** the atomic counter function — both belong to the same logical change):

```sql
-- Allow admins to INSERT new stickers and to UPDATE the per-group counter.
-- Read-only policies remain in migrations 008 and 021.

CREATE POLICY "stickers_insert_admin"
  ON stickers FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "sticker_groups_update_admin"
  ON sticker_groups FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Atomic counter increment. Called by the createSticker server action
-- because the JS Supabase client cannot express `col = col + 1` in a
-- single round-trip. SECURITY DEFINER bypasses RLS so the function
-- itself is the authorization boundary — but we only GRANT it to
-- authenticated callers, and the server action checks is_admin before
-- calling it.
CREATE OR REPLACE FUNCTION increment_sticker_group_count(p_group_id INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.sticker_groups
  SET sticker_count = sticker_count + 1
  WHERE id = p_group_id;
$$;

REVOKE ALL ON FUNCTION increment_sticker_group_count(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_sticker_group_count(INT) TO authenticated;
```

- [ ] **Step 3: Apply migration to local Supabase**

Run: `npx supabase db push` (or `npx supabase migration up` depending on how the local stack is run — check `supabase/` for the convention used; if neither works, ask the user how migrations are applied in this repo).

Expected: command completes without error and prints the new migration applied.

- [ ] **Step 4: Verify policies are present**

Run:
```bash
npx supabase db remote query "SELECT polname FROM pg_policy WHERE polrelid IN ('stickers'::regclass, 'sticker_groups'::regclass) ORDER BY polname;"
```
If `db remote query` is not the right CLI command, use the Supabase Studio SQL Editor and run the same `SELECT`. Expected to include `stickers_insert_admin` and `sticker_groups_update_admin` in the output.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/025_admin_stickers_write.sql
git commit -m "feat(stickers): allow admin inserts and group counter updates via RLS"
```

---

## Task 2: Implement the `createSticker` Server Action

**Files:**
- Create: `app/admin/(dashboard)/stickers/actions.ts`

- [ ] **Step 1: Create the Server Action file**

Write `app/admin/(dashboard)/stickers/actions.ts` with this exact content:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateStickerInput = {
  groupId: number;
  code: string;
  number: number;
  title?: string;
  description?: string;
};

export type CreateStickerResult =
  | { data: { id: number; code: string }; error: null }
  | { data: null; error: "unauthorized" | "duplicate_code" | "invalid_input" | "unknown" };

export async function createSticker(input: CreateStickerInput): Promise<CreateStickerResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "unauthorized" };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!admin) {
    return { data: null, error: "unauthorized" };
  }

  const code = input.code.trim().toUpperCase();
  const number = Number(input.number);

  if (
    !Number.isInteger(input.groupId) ||
    input.groupId <= 0 ||
    code.length === 0 ||
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return { data: null, error: "invalid_input" };
  }

  const { data: group } = await supabase
    .from("sticker_groups")
    .select("id")
    .eq("id", input.groupId)
    .single();
  if (!group) {
    return { data: null, error: "invalid_input" };
  }

  const title = input.title?.trim() || null;
  const description = input.description?.trim() || null;

  const { data: inserted, error: insertError } = await supabase
    .from("stickers")
    .insert({
      group_id: input.groupId,
      code,
      number,
      title,
      description,
    })
    .select("id, code")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { data: null, error: "duplicate_code" };
    }
    console.error("createSticker insert failed:", insertError);
    return { data: null, error: "unknown" };
  }

  const { error: counterError } = await supabase.rpc("increment_sticker_group_count", {
    p_group_id: input.groupId,
  });

  if (counterError) {
    console.error("createSticker counter increment failed:", counterError);
    // Sticker was created; counter drift is recoverable, do not fail the request.
  }

  return { data: { id: inserted.id, code: inserted.code }, error: null };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If errors mention `supabase.rpc` typing, ignore — the project uses untyped Supabase queries already.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new warnings on the new file.

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(dashboard\)/stickers/actions.ts
git commit -m "feat(stickers): add createSticker server action"
```

---

## Task 3: Pass authenticated user id to the stickers admin client component

`StickerImageUpload` requires `userId`. Today the stickers page does not fetch it.

**Files:**
- Modify: `app/admin/(dashboard)/stickers/page.tsx`

- [ ] **Step 1: Update `page.tsx` to fetch the user and pass `userId`**

Replace the entire content of `app/admin/(dashboard)/stickers/page.tsx` with:

```tsx
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
    .select("id, group_id, code, number, title, description, image_url")
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
```

The `user!.id` non-null assertion is safe: the admin layout (`app/admin/(dashboard)/layout.tsx`) already redirects to `/admin/login` when there is no user.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: one error in `stickers-admin.tsx` complaining about the new `userId` prop. That is fixed in Task 4.

- [ ] **Step 3: Do NOT commit yet** — the build is broken until Task 4 introduces the prop in `stickers-admin.tsx`. Combine with Task 4 in the same commit.

---

## Task 4: Add the `+` card and creation modal scaffolding

This task creates the new component `create-sticker-modal.tsx`, wires it into `stickers-admin.tsx`, accepts the new `userId` prop (unused yet — used in Task 6), and renders the form without submit logic. Submit logic comes in Task 5.

**Files:**
- Create: `app/admin/(dashboard)/stickers/create-sticker-modal.tsx`
- Modify: `app/admin/(dashboard)/stickers/stickers-admin.tsx`

- [ ] **Step 1: Create the modal component**

Write `app/admin/(dashboard)/stickers/create-sticker-modal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Group {
  id: number;
  name: string;
  code: string;
}

interface ExistingSticker {
  group_id: number;
  number: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  existingStickers: ExistingSticker[];
  defaultGroupId: number | null;
  onSubmit: (input: {
    groupId: number;
    code: string;
    number: number;
    title: string;
    description: string;
  }) => Promise<{ ok: true } | { ok: false; field?: "code"; message: string }>;
}

export function CreateStickerModal({
  open,
  onClose,
  groups,
  existingStickers,
  defaultGroupId,
  onSubmit,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [code, setCode] = useState("");
  const [number, setNumber] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Open/close <dialog> imperatively and (re)initialize state when opening.
  useEffect(() => {
    if (open) {
      setGroupId(defaultGroupId);
      setCode("");
      setNumber("");
      setTitle("");
      setDescription("");
      setCodeError(null);
      setGeneralError(null);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open, defaultGroupId]);

  // Suggested next number based on the currently selected group.
  const suggestedNumber = (() => {
    if (groupId == null) return "";
    const numbers = existingStickers
      .filter((s) => s.group_id === groupId)
      .map((s) => s.number);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(max + 1);
  })();

  const numberValue = number === "" ? suggestedNumber : number;
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;

  const prefixWarning =
    selectedGroup && code.length > 0 && !code.toUpperCase().startsWith(selectedGroup.code)
      ? `O código não segue o padrão do grupo \`${selectedGroup.code}\`.`
      : null;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setGeneralError(null);

    if (groupId == null) {
      setGeneralError("Selecione um grupo.");
      return;
    }
    const trimmedCode = code.trim();
    if (trimmedCode.length === 0) {
      setCodeError("Informe o código da figurinha.");
      return;
    }
    const parsedNumber = Number(numberValue);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      setGeneralError("Número precisa ser um inteiro positivo.");
      return;
    }

    if (
      selectedGroup &&
      !trimmedCode.toUpperCase().startsWith(selectedGroup.code) &&
      !window.confirm("O código não segue o padrão do grupo. Continuar?")
    ) {
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      groupId,
      code: trimmedCode,
      number: parsedNumber,
      title,
      description,
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.field === "code") {
        setCodeError(result.message);
      } else {
        setGeneralError(result.message);
      }
      return;
    }
    // Parent calls onClose() after handling success.
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-full max-w-md rounded-xl bg-gray-800 p-0 text-white backdrop:bg-black/60"
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Adicionar figurinha</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Grupo */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Grupo</label>
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors">
              <span className={selectedGroup ? "text-white" : "text-gray-400"}>
                {selectedGroup ? selectedGroup.name : "Selecionar grupo"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command
                filter={(value, search) => {
                  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                  return 0;
                }}
              >
                <CommandInput placeholder="Buscar grupo..." />
                <CommandList>
                  <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                  <CommandGroup>
                    {[...groups]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((g) => (
                        <CommandItem
                          key={g.id}
                          value={`${g.code} ${g.name}`}
                          onSelect={() => {
                            setGroupId(g.id);
                            setGroupOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              groupId === g.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {g.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Código</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={selectedGroup ? `${selectedGroup.code}21` : "BRA21"}
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white uppercase placeholder:text-gray-500 placeholder:normal-case focus:border-green-500 focus:ring-1 focus:ring-green-500"
            autoCapitalize="characters"
            autoComplete="off"
          />
          {codeError && (
            <p className="mt-1 text-xs text-red-400">{codeError}</p>
          )}
          {!codeError && prefixWarning && (
            <p className="mt-1 text-xs text-yellow-400">{prefixWarning}</p>
          )}
        </div>

        {/* Número */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Número</label>
          <input
            type="number"
            min={1}
            step={1}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={suggestedNumber || "1"}
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          {suggestedNumber && number === "" && (
            <p className="mt-1 text-xs text-gray-500">
              Sugestão para este grupo: {suggestedNumber}
            </p>
          )}
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do jogador, estádio, etc."
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        {generalError && (
          <p className="text-xs text-red-400">{generalError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
}
```

- [ ] **Step 2: Modify `stickers-admin.tsx` to accept `userId`, render the `+` card on page 1, and open the create modal (no submit logic yet)**

In `app/admin/(dashboard)/stickers/stickers-admin.tsx`:

a) Update the `Props` type and component signature:

Find:
```tsx
export function StickersAdmin({ groups, stickers }: { groups: Group[]; stickers: Sticker[] }) {
```

Replace with:
```tsx
export function StickersAdmin({
  groups,
  stickers,
  userId,
}: {
  groups: Group[];
  stickers: Sticker[];
  userId: string;
}) {
```

b) Add the import at the top of the file (after the existing imports):
```tsx
import { CreateStickerModal } from "./create-sticker-modal";
```

(Leave `userId` unused for now — TypeScript will not error since it's used as a prop.)

c) Add state for the create modal next to the existing `useState` declarations:
```tsx
const [createOpen, setCreateOpen] = useState(false);
```

d) Add the `+` card as the first item of the grid, but only on page 1. Find this block in the JSX:
```tsx
      {/* Stickers grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {paginatedStickers.map((sticker) => (
```

Insert the `+` card immediately inside the grid, before the `{paginatedStickers.map(...)}`:

```tsx
      {/* Stickers grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {page === 1 && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group flex aspect-[2/3] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-white/60 hover:border-green-500/60 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Adicionar figurinha"
          >
            <span className="text-4xl leading-none">+</span>
            <span className="mt-2 text-xs font-medium">Adicionar</span>
          </button>
        )}
        {paginatedStickers.map((sticker) => (
```

(Keep the rest of the `.map(...)` body and the closing `</div>` untouched.)

e) Add the modal render at the bottom of the returned JSX, just **before** the existing `<dialog>` for editing:

```tsx
      <CreateStickerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        groups={groups}
        existingStickers={stickers}
        defaultGroupId={selectedGroup}
        onSubmit={async () => {
          // Wired up in Task 5.
          return { ok: false, message: "Em construção" };
        }}
      />
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: no errors. `userId` is declared but unused — ESLint may warn. If it warns, prefix the destructured name with an underscore temporarily (`userId: _userId`) **only** if your local lint config flags unused-vars. It will be used in Task 6, so prefer leaving it as `userId` and silencing the warning at the top of the destructuring with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` **only if** lint fails.

- [ ] **Step 4: Manual smoke test in the dev server**

Run: `npm run dev` (kill any previous instance with Ctrl+C first).

Open `http://localhost:3000/admin/stickers` while signed in as an admin.

Verify:
- A dashed `+ Adicionar` card appears as the first item of the grid on page 1.
- Navigating to page 2 or later: no `+` card; the grid starts with stickers.
- Clicking the `+` card opens the create modal. The fields render. The group combobox lists groups.
- With a group filter active before opening the modal, the modal opens with that group pre-selected.
- Clicking Salvar shows the inline error "Em construção" (placeholder). Cancel/× closes the modal.

- [ ] **Step 5: Commit**

```bash
git add app/admin/\(dashboard\)/stickers/page.tsx app/admin/\(dashboard\)/stickers/stickers-admin.tsx app/admin/\(dashboard\)/stickers/create-sticker-modal.tsx
git commit -m "feat(admin): add create-sticker modal scaffolding and entry card"
```

---

## Task 5: Wire the modal submit to the Server Action

**Files:**
- Modify: `app/admin/(dashboard)/stickers/stickers-admin.tsx`

- [ ] **Step 1: Add imports**

At the top of `stickers-admin.tsx`, with the other imports, add:
```tsx
import { toast } from "sonner";
import { createSticker } from "./actions";
```

- [ ] **Step 2: Replace the placeholder `onSubmit`**

Find this block from Task 4:
```tsx
        onSubmit={async () => {
          // Wired up in Task 5.
          return { ok: false, message: "Em construção" };
        }}
```

Replace with:
```tsx
        onSubmit={async (input) => {
          const result = await createSticker(input);
          if (result.error === "duplicate_code") {
            return { ok: false, field: "code", message: "Já existe figurinha com esse código." };
          }
          if (result.error === "unauthorized") {
            toast.error("Acesso negado.");
            return { ok: false, message: "Acesso negado." };
          }
          if (result.error === "invalid_input") {
            return { ok: false, message: "Dados inválidos. Verifique os campos." };
          }
          if (result.error === "unknown") {
            toast.error("Erro ao criar figurinha. Tente novamente.");
            return { ok: false, message: "Erro ao criar figurinha. Tente novamente." };
          }
          // Success — Task 6 chains the image upload here.
          setCreateOpen(false);
          toast.success(`Figurinha ${result.data.code} criada.`);
          router.refresh();
          return { ok: true };
        }}
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: no errors. (`userId` may still be unused; it gets used in Task 6.)

- [ ] **Step 4: Manual verification — happy path and error paths**

Run: `npm run dev`. Sign in as admin and open `http://localhost:3000/admin/stickers`.

Test cases (use real data, then clean up via Supabase Studio or roll back if needed):

1. **Happy path:** Open create modal → select a group (e.g., "Brasil") → type a code that follows the prefix (e.g., `BRA99`) → number suggestion appears → submit. Expected: toast "Figurinha BRA99 criada", modal closes, grid refreshes and shows the new sticker (filter by Brasil to find it quickly).

2. **Duplicate code:** Open modal → enter an existing code (e.g., `CC1`) → submit. Expected: inline red error under Code field: "Já existe figurinha com esse código." Modal stays open with other fields preserved.

3. **Prefix mismatch (with confirmation):** Open modal → select group "Brasil" → type code `FWC99` → submit. Expected: `window.confirm` dialog appears with "O código não segue o padrão do grupo. Continuar?". Cancel → nothing happens. OK → submit proceeds (and either succeeds if free, or shows duplicate error).

4. **Empty code:** Submit with empty code field. Expected: inline red error "Informe o código da figurinha."

5. **Group prefill:** Filter the page to a group (e.g., "Argentina") → open create modal. Expected: Group combobox is already on "Argentina"; number suggestion is `max(number) + 1` of that group.

6. **Counter check:** Before submitting the happy-path case, note `sticker_count` of the chosen group (visible in Supabase Studio). After submit, query `sticker_groups` and confirm `sticker_count` increased by exactly 1.

If any test fails, fix and re-verify before committing. Clean up any sticker records created during testing if they would interfere with later tasks.

- [ ] **Step 5: Commit**

```bash
git add app/admin/\(dashboard\)/stickers/stickers-admin.tsx
git commit -m "feat(admin): wire create-sticker modal to server action"
```

---

## Task 6: Chain `StickerImageUpload` after successful creation

After a successful create, open the existing image-upload modal so admin can attach a photo immediately.

**Files:**
- Modify: `app/admin/(dashboard)/stickers/stickers-admin.tsx`

- [ ] **Step 1: Add the import**

At the top of `stickers-admin.tsx`, with the other imports, add:
```tsx
import { StickerImageUpload } from "@/components/sticker-image-upload";
```

- [ ] **Step 2: Add state for the chained upload modal**

Near the other `useState` calls, add:
```tsx
const [postCreateUpload, setPostCreateUpload] = useState<{ id: number; code: string } | null>(null);
```

- [ ] **Step 3: Update the success branch in `onSubmit` to open the upload modal instead of refreshing immediately**

Find the success branch you wrote in Task 5:
```tsx
          // Success — Task 6 chains the image upload here.
          setCreateOpen(false);
          toast.success(`Figurinha ${result.data.code} criada.`);
          router.refresh();
          return { ok: true };
```

Replace with:
```tsx
          // Success — close create modal and open the image upload modal.
          setCreateOpen(false);
          toast.success(`Figurinha ${result.data.code} criada. Adicione uma foto (opcional).`);
          setPostCreateUpload({ id: result.data.id, code: result.data.code });
          return { ok: true };
```

- [ ] **Step 4: Render `StickerImageUpload` controlled by `postCreateUpload`**

Just after the `<CreateStickerModal ... />` JSX, add:
```tsx
      {postCreateUpload && (
        <StickerImageUpload
          open={true}
          onClose={() => {
            setPostCreateUpload(null);
            router.refresh();
          }}
          stickerId={postCreateUpload.id}
          stickerCode={postCreateUpload.code}
          userId={userId}
          currentImageUrl={null}
          onSuccess={() => {
            setPostCreateUpload(null);
            router.refresh();
          }}
          onSkip={() => {
            setPostCreateUpload(null);
            router.refresh();
          }}
        />
      )}
```

The `StickerImageUpload` component's `onSuccess` runs after upload+update+audit insert succeed; it then calls its own `handleClose`. We also reset our state and refresh. `onSkip` is fired only when the user explicitly clicks "Pular e adicionar sem foto". `onClose` covers the dialog-dismissed case (clicking outside or pressing Esc).

- [ ] **Step 5: Type-check and lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: no errors. `userId` is now actually used.

- [ ] **Step 6: Manual verification of the chained flow**

Run: `npm run dev`. Sign in as admin. Open `/admin/stickers`.

Test cases:

1. **Create + upload via camera (mobile or browser camera):** Create a new sticker. After success toast, the image upload modal should open. Click **Câmera**, take a photo (or use the file picker dialog if camera unavailable), crop, **Confirmar**. Expected: upload succeeds, modal closes, grid refreshes, new sticker appears with the photo.

2. **Create + upload via gallery:** Create another sticker. Click **Galeria**, pick a local image, crop, **Confirmar**. Expected: same as above.

3. **Create + skip:** Create another sticker. Click **Pular e adicionar sem foto**. Expected: modal closes, grid refreshes, new sticker appears without an image (placeholder icon).

4. **Create + dismiss (Esc):** Create another sticker. Press Esc on the upload modal. Expected: modal closes, grid refreshes, sticker exists without an image (same end-state as skip).

5. **Verify audit row for the upload cases:** In Supabase Studio, `SELECT * FROM sticker_image_uploads ORDER BY created_at DESC LIMIT 5;` should show a row per upload with the admin's `user_id`.

- [ ] **Step 7: Commit**

```bash
git add app/admin/\(dashboard\)/stickers/stickers-admin.tsx
git commit -m "feat(admin): chain image upload modal after sticker creation"
```

---

## Task 7: Final end-to-end verification and build check

**Files:** none modified.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build completes successfully with no type errors. If the build fails, fix the issue and re-run.

- [ ] **Step 2: Lint clean**

Run: `npm run lint`
Expected: no errors and no warnings introduced by this branch.

- [ ] **Step 3: Re-run the dev server and smoke-test the full happy path one more time**

Run: `npm run dev`. Sign in as admin. Verify:
- `+` card present on page 1.
- Create a sticker with a fresh code, attach an image via gallery, confirm.
- New sticker appears in the grid with the photo.
- Filter by the chosen group → `sticker_count` displayed in the page (if shown) is consistent with the actual count.
- Sign out and sign back in as a **non-admin** user. Open the URL `/admin/stickers` directly. Expected: layout redirects to `/admin/login`. (This validates that the route protection still works — the Server Action's admin check is defense-in-depth.)

- [ ] **Step 4: Confirm no leftover test data**

If you created throwaway stickers during verification, delete them via Supabase Studio (or keep them if they are real album entries). When deleting, also `UPDATE sticker_groups SET sticker_count = sticker_count - 1 WHERE id = <group_id>` to keep the counter consistent — there is no trigger for that today.

- [ ] **Step 5: Open PR**

Push the branch and open a PR via `gh pr create` if requested by the user. Otherwise stop here — the user opens PRs manually.

---

## Self-Review Notes

- **Spec coverage:** Card `+` (Task 4), modal fields (Task 4), client validations (Task 4), prefix warning + confirm (Task 4), Server Action with admin check + counter (Task 2), RLS migration (Task 1), error mapping (Task 5), `StickerImageUpload` chaining (Task 6), `router.refresh()` after image flow closes (Task 6).
- **Counter atomicity:** spec calls for `UPDATE ... = sticker_count + 1`. Task 2 implements this via a `SECURITY DEFINER` SQL function (`increment_sticker_group_count`) because the JS Supabase client can't issue `col = col + 1` directly. Same atomicity guarantee.
- **`number` suggestion:** computed client-side from props (Task 4), matching the spec.
- **`userId` plumbing:** added in Task 3 (page fetch) and consumed in Task 6 (`StickerImageUpload`).
- **No test framework introduced.** All verification is manual + `tsc` + lint + `next build`, consistent with the project today.
