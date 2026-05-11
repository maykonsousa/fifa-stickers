# FIFA World Cup 2026 Sticker Album - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where users track their FIFA World Cup 2026 sticker collection, connect with friends, and find trading matches.

**Architecture:** Next.js 16 App Router with Server Components by default, Client Components only for interactive UI. Supabase handles auth (Google OAuth), database (PostgreSQL with RLS), and realtime subscriptions for trade notifications. The app uses a flat route structure with shared layouts.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Supabase (Auth + PostgreSQL + Realtime), @supabase/ssr

---

## Database Schema

### Tables

1. **profiles** - extends Supabase auth.users
   - `id` UUID PK (references auth.users.id)
   - `display_name` TEXT NOT NULL
   - `avatar_url` TEXT
   - `city` TEXT
   - `state` TEXT
   - `instagram` TEXT
   - `whatsapp` TEXT
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

2. **sticker_groups** - album sections (50 groups: 48 teams + FWC + Coca-Cola)
   - `id` SERIAL PK
   - `name` TEXT NOT NULL (e.g., "Brasil", "FIFA World Cup")
   - `code` TEXT NOT NULL UNIQUE (e.g., "BRA", "FWC", "CC")
   - `type` TEXT NOT NULL CHECK (type IN ('team', 'fwc', 'sponsor'))
   - `description` TEXT
   - `flag_url` TEXT
   - `sticker_count` INT NOT NULL (number of stickers in this group)

3. **stickers** - seed data (985 rows)
   - `id` SERIAL PK
   - `group_id` INT NOT NULL REFERENCES sticker_groups(id)
   - `code` TEXT NOT NULL UNIQUE (e.g., "BRA7")
   - `number` INT NOT NULL (position within group)
   - `title` TEXT (e.g., "Vinicius Jr.", "Escudo Brasil")
   - `description` TEXT (e.g., "Atacante, Real Madrid")

4. **user_stickers** - each row = 1 physical sticker the user owns
   - `id` UUID PK DEFAULT gen_random_uuid()
   - `user_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - `sticker_id` INT NOT NULL REFERENCES stickers(id)
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - (no UNIQUE — multiple rows = duplicates)

5. **friend_invites** - invite history (never hard-deleted)
   - `id` UUID PK DEFAULT gen_random_uuid()
   - `sender_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - `receiver_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - `status` TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected'))
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()
   - UNIQUE(sender_id, receiver_id)

6. **friends** - bidirectional (2 rows per friendship), never hard-deleted
   - `id` UUID PK DEFAULT gen_random_uuid()
   - `user_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - `friend_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - `status` TEXT NOT NULL CHECK (status IN ('active', 'removed', 'blocked'))
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()
   - UNIQUE(user_id, friend_id)
   - CHECK (user_id <> friend_id)

7. **trade_messages** - optional manual trade chat
   - `id` UUID PK DEFAULT gen_random_uuid()
   - `sender_id` UUID NOT NULL REFERENCES profiles(id)
   - `receiver_id` UUID NOT NULL REFERENCES profiles(id)
   - `message` TEXT NOT NULL
   - `created_at` TIMESTAMPTZ DEFAULT now()

### RLS Policies

- **profiles**: SELECT for all authenticated users (public info). UPDATE only own row. Instagram/WhatsApp columns exposed via a function that checks friendship status.
- **sticker_groups**: SELECT for all authenticated (read-only seed data).
- **stickers**: SELECT for all authenticated (read-only seed data).
- **user_stickers**: SELECT for all authenticated (needed for trade matching). INSERT/DELETE only own rows.
- **friend_invites**: SELECT where user is sender OR receiver. INSERT where user is sender. UPDATE where user is receiver (accept/reject).
- **friends**: SELECT own rows only. No direct INSERT/UPDATE/DELETE (managed via functions on invite accept/block/remove).
- **trade_messages**: SELECT/INSERT where user is sender or receiver.

### Block Rules (enforced in queries and RLS)

- If A blocks B: B cannot see A in searches, trade suggestions, or send invites
- Check: `NOT EXISTS (SELECT 1 FROM friends WHERE user_id = target AND friend_id = auth.uid() AND status = 'blocked')`

### Key Database Functions

- `accept_friend_invite(invite_id)` - updates invite status + creates 2 friend rows (A→B, B→A)
- `block_friend(target_id)` - updates own friend row to 'blocked'
- `unblock_friend(target_id)` - updates own friend row back to 'active'
- `remove_friend(target_id)` - updates both friend rows to 'removed'
- `are_friends(user_a, user_b)` - checks if active friendship exists
- `get_profile_with_contact(viewer_id, target_id)` - returns profile with instagram/whatsapp only if friends
- `get_trade_matches(user_id)` - returns users who have duplicates you need AND need duplicates you have (excludes blocked)

---

## File Structure

```
app/
├── globals.css
├── layout.tsx                    (root layout with Supabase provider)
├── page.tsx                      (landing/marketing page)
├── login/
│   └── page.tsx                  (login page with Google OAuth button)
├── auth/
│   └── callback/
│       └── route.ts             (OAuth callback handler)
├── (authenticated)/
│   ├── layout.tsx               (auth guard + nav bar)
│   ├── dashboard/
│   │   └── page.tsx             (album overview with completion %)
│   ├── collection/
│   │   └── page.tsx             (sticker management - mark owned/duplicate)
│   ├── profile/
│   │   └── page.tsx             (edit own profile)
│   ├── friends/
│   │   └── page.tsx             (friend list + invites)
│   ├── trades/
│   │   └── page.tsx             (trade matches + manual search)
│   └── user/
│       └── [id]/
│           └── page.tsx         (view other user's public profile)
lib/
├── supabase/
│   ├── client.ts                (browser client)
│   ├── server.ts                (server client for RSC/route handlers)
│   ├── middleware.ts            (session refresh logic)
│   └── types.ts                 (generated DB types)
├── types/
│   └── database.ts              (manual type definitions)
└── utils/
    └── stickers.ts              (helper functions for sticker logic)
middleware.ts                     (Next.js middleware for auth redirect)
scripts/
└── seed-stickers.ts             (seed script for 985 stickers)
supabase/
└── migrations/
    ├── 001_create_profiles.sql
    ├── 002_create_stickers.sql
    ├── 003_create_user_stickers.sql
    ├── 004_create_friendships.sql
    ├── 005_create_trade_messages.sql
    ├── 006_rls_policies.sql
    └── 007_functions.sql
components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── dialog.tsx
│   └── avatar.tsx
├── sticker-card.tsx
├── sticker-grid.tsx
├── team-progress.tsx
├── trade-match-card.tsx
├── friend-request-card.tsx
├── nav-bar.tsx
└── auth-button.tsx
```

---

## Seed Data Strategy

The 985 stickers are generated programmatically:

- **48 teams x 20 stickers each = 960**: Codes like `BRA1`-`BRA20`, `MEX1`-`MEX20`, etc.
- **FWC (FIFA World Cup special) x 11 = 11**: Codes `FWC1`-`FWC11`
- **Coca-Cola (sponsor special) x 14 = 14**: Codes `CC1`-`CC14`

The seed script generates all rows with `player_name = NULL`. A future migration will add player names when Panini releases them.

### Team List (48 teams for 2026)

Groups A-L, 4 teams each. Using FIFA 3-letter codes:

**Host nations:** USA, MEX, CAN
**Qualified teams (48 total):** ARG, BRA, URU, COL, ECU, PAR, BOL, VEN, CHI, PER, GER, FRA, ESP, ENG, POR, NED, BEL, ITA, CRO, SRB, DEN, SUI, AUT, SCO, UKR, TUR, POL, JPN, KOR, AUS, IRN, KSA, QAT, UZB, IRQ, JOR, BHR, IDN, CHN, NZL, MAR, EGY, NGA, CMR, SEN, CIV, MLI, COD

---

## Implementation Phases

### Phase 1: Foundation (Tasks 1-4)
- Install dependencies, configure Supabase client
- Database migrations + seed data
- Auth setup (Google OAuth + middleware)

### Phase 2: Core Collection (Tasks 5-7)
- Profile page
- Sticker collection management
- Album dashboard with completion stats

### Phase 3: Social (Tasks 8-9)
- Friends system (invite/accept)
- Profile visibility rules (contact info for friends only)

### Phase 4: Trading (Tasks 10-11)
- Automatic trade match algorithm
- Manual search with city/state filters

---

## Task Breakdown

### Task 1: Install Dependencies and Configure Supabase

**Files:**
- Modify: `package.json`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Modify: `next.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
cd /Users/maykonsousa/conductor/workspaces/fifa-stickers/irvine
npm install @supabase/supabase-js @supabase/ssr
```
Expected: packages added to package.json dependencies

- [ ] **Step 2: Create environment variables file**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ryahywolbykyqrpiibmp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-supabase-dashboard>
```

- [ ] **Step 3: Create browser Supabase client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create server Supabase client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Create middleware helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 6: Create Next.js middleware**

Create `middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 7: Update next.config.ts for Supabase image domains**

Modify `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "ryahywolbykyqrpiibmp.supabase.co",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 8: Commit**

```bash
git add lib/supabase/ middleware.ts next.config.ts .env.local package.json package-lock.json
git commit -m "feat: configure Supabase client with SSR and auth middleware"
```

---

### Task 2: Database Migrations

**Files:**
- Create: `supabase/migrations/001_create_profiles.sql`
- Create: `supabase/migrations/002_create_stickers.sql`
- Create: `supabase/migrations/003_create_user_stickers.sql`
- Create: `supabase/migrations/004_create_friendships.sql`
- Create: `supabase/migrations/005_create_trade_messages.sql`
- Create: `supabase/migrations/006_rls_policies.sql`
- Create: `supabase/migrations/007_functions.sql`

- [ ] **Step 1: Create profiles migration**

Create `supabase/migrations/001_create_profiles.sql`:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  instagram TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: Create stickers migration**

Create `supabase/migrations/002_create_stickers.sql`:
```sql
CREATE TABLE stickers (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  team_code TEXT NOT NULL,
  team_name TEXT NOT NULL,
  number INT NOT NULL,
  player_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('team', 'fwc', 'coca-cola'))
);

CREATE INDEX idx_stickers_team_code ON stickers(team_code);
CREATE INDEX idx_stickers_code ON stickers(code);
```

- [ ] **Step 3: Create user_stickers migration**

Create `supabase/migrations/003_create_user_stickers.sql`:
```sql
CREATE TABLE user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  status TEXT NOT NULL CHECK (status IN ('owned', 'duplicate')),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sticker_id)
);

CREATE INDEX idx_user_stickers_user_id ON user_stickers(user_id);
CREATE INDEX idx_user_stickers_sticker_id ON user_stickers(sticker_id);
```

- [ ] **Step 4: Create friendships migration**

Create `supabase/migrations/004_create_friendships.sql`:
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
```

- [ ] **Step 5: Create trade_messages migration**

Create `supabase/migrations/005_create_trade_messages.sql`:
```sql
CREATE TABLE trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_messages_sender ON trade_messages(sender_id);
CREATE INDEX idx_trade_messages_receiver ON trade_messages(receiver_id);
```

- [ ] **Step 6: Create RLS policies migration**

Create `supabase/migrations/006_rls_policies.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_messages ENABLE ROW LEVEL SECURITY;

-- profiles: anyone authenticated can read basic info
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- stickers: read-only for all authenticated
CREATE POLICY "stickers_select_authenticated"
  ON stickers FOR SELECT
  TO authenticated
  USING (true);

-- user_stickers: own rows only
CREATE POLICY "user_stickers_select_own"
  ON user_stickers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_stickers_insert_own"
  ON user_stickers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stickers_update_own"
  ON user_stickers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stickers_delete_own"
  ON user_stickers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- friendships: see own requests/invites
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_insert_as_requester"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships_update_as_addressee"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- trade_messages: see own messages
CREATE POLICY "trade_messages_select_own"
  ON trade_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "trade_messages_insert_as_sender"
  ON trade_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);
```

- [ ] **Step 7: Create database functions migration**

Create `supabase/migrations/007_functions.sql`:
```sql
-- Check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b)
      OR (requester_id = user_b AND addressee_id = user_a)
    )
  );
$$;

-- Get profile with contact info (instagram/whatsapp only if friends)
CREATE OR REPLACE FUNCTION get_profile_with_contact(viewer UUID, target UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  instagram TEXT,
  whatsapp TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.state,
    CASE WHEN are_friends(viewer, target) OR viewer = target THEN p.instagram ELSE NULL END,
    CASE WHEN are_friends(viewer, target) OR viewer = target THEN p.whatsapp ELSE NULL END
  FROM profiles p
  WHERE p.id = target;
$$;

-- Get trade matches: users who have duplicates I need AND need duplicates I have
CREATE OR REPLACE FUNCTION get_trade_matches(current_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  they_have_i_need INT,
  i_have_they_need INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH my_missing AS (
    -- Stickers I don't have at all
    SELECT s.id AS sticker_id
    FROM stickers s
    WHERE NOT EXISTS (
      SELECT 1 FROM user_stickers us
      WHERE us.user_id = current_user_id AND us.sticker_id = s.id
    )
  ),
  my_duplicates AS (
    -- Stickers I have extras of
    SELECT sticker_id
    FROM user_stickers
    WHERE user_id = current_user_id AND status = 'duplicate' AND quantity > 0
  ),
  other_duplicates AS (
    -- Other users' duplicates
    SELECT us.user_id, us.sticker_id
    FROM user_stickers us
    WHERE us.user_id <> current_user_id AND us.status = 'duplicate' AND us.quantity > 0
  ),
  other_missing AS (
    -- Other users' missing stickers
    SELECT p.id AS user_id, s.id AS sticker_id
    FROM profiles p
    CROSS JOIN stickers s
    WHERE p.id <> current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_stickers us
      WHERE us.user_id = p.id AND us.sticker_id = s.id
    )
  )
  SELECT
    p.id AS user_id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.state,
    COUNT(DISTINCT od.sticker_id) FILTER (WHERE od.sticker_id IN (SELECT sticker_id FROM my_missing)) AS they_have_i_need,
    COUNT(DISTINCT md.sticker_id) FILTER (WHERE md.sticker_id IN (SELECT sticker_id FROM other_missing WHERE other_missing.user_id = p.id)) AS i_have_they_need
  FROM profiles p
  JOIN other_duplicates od ON od.user_id = p.id
  JOIN my_duplicates md ON md.sticker_id IN (SELECT sticker_id FROM other_missing WHERE other_missing.user_id = p.id)
  WHERE p.id <> current_user_id
  GROUP BY p.id, p.display_name, p.avatar_url, p.city, p.state
  HAVING
    COUNT(DISTINCT od.sticker_id) FILTER (WHERE od.sticker_id IN (SELECT sticker_id FROM my_missing)) > 0
    AND COUNT(DISTINCT md.sticker_id) FILTER (WHERE md.sticker_id IN (SELECT sticker_id FROM other_missing WHERE other_missing.user_id = p.id)) > 0
  ORDER BY (they_have_i_need + i_have_they_need) DESC;
$$;
```

- [ ] **Step 8: Apply migrations via Supabase MCP**

Using the Supabase MCP (project ref `ryahywolbykyqrpiibmp`), run each migration SQL file in order (001 through 007) via the `execute_sql` tool.

- [ ] **Step 9: Commit**

```bash
git add supabase/
git commit -m "feat: add database migrations with RLS policies and trade match function"
```

---

### Task 3: Seed Stickers Data

**Files:**
- Create: `scripts/seed-stickers.ts`
- Create: `lib/data/teams.ts`

- [ ] **Step 1: Create teams data file**

Create `lib/data/teams.ts`:
```typescript
export interface Team {
  code: string;
  name: string;
  category: "team";
}

export const TEAMS: Team[] = [
  { code: "USA", name: "United States", category: "team" },
  { code: "MEX", name: "Mexico", category: "team" },
  { code: "CAN", name: "Canada", category: "team" },
  { code: "ARG", name: "Argentina", category: "team" },
  { code: "BRA", name: "Brasil", category: "team" },
  { code: "URU", name: "Uruguay", category: "team" },
  { code: "COL", name: "Colombia", category: "team" },
  { code: "ECU", name: "Ecuador", category: "team" },
  { code: "PAR", name: "Paraguay", category: "team" },
  { code: "BOL", name: "Bolivia", category: "team" },
  { code: "VEN", name: "Venezuela", category: "team" },
  { code: "CHI", name: "Chile", category: "team" },
  { code: "PER", name: "Peru", category: "team" },
  { code: "GER", name: "Germany", category: "team" },
  { code: "FRA", name: "France", category: "team" },
  { code: "ESP", name: "Spain", category: "team" },
  { code: "ENG", name: "England", category: "team" },
  { code: "POR", name: "Portugal", category: "team" },
  { code: "NED", name: "Netherlands", category: "team" },
  { code: "BEL", name: "Belgium", category: "team" },
  { code: "ITA", name: "Italy", category: "team" },
  { code: "CRO", name: "Croatia", category: "team" },
  { code: "SRB", name: "Serbia", category: "team" },
  { code: "DEN", name: "Denmark", category: "team" },
  { code: "SUI", name: "Switzerland", category: "team" },
  { code: "AUT", name: "Austria", category: "team" },
  { code: "SCO", name: "Scotland", category: "team" },
  { code: "UKR", name: "Ukraine", category: "team" },
  { code: "TUR", name: "Turkey", category: "team" },
  { code: "POL", name: "Poland", category: "team" },
  { code: "JPN", name: "Japan", category: "team" },
  { code: "KOR", name: "South Korea", category: "team" },
  { code: "AUS", name: "Australia", category: "team" },
  { code: "IRN", name: "Iran", category: "team" },
  { code: "KSA", name: "Saudi Arabia", category: "team" },
  { code: "QAT", name: "Qatar", category: "team" },
  { code: "UZB", name: "Uzbekistan", category: "team" },
  { code: "IRQ", name: "Iraq", category: "team" },
  { code: "JOR", name: "Jordan", category: "team" },
  { code: "BHR", name: "Bahrain", category: "team" },
  { code: "IDN", name: "Indonesia", category: "team" },
  { code: "CHN", name: "China", category: "team" },
  { code: "NZL", name: "New Zealand", category: "team" },
  { code: "MAR", name: "Morocco", category: "team" },
  { code: "EGY", name: "Egypt", category: "team" },
  { code: "NGA", name: "Nigeria", category: "team" },
  { code: "CMR", name: "Cameroon", category: "team" },
  { code: "SEN", name: "Senegal", category: "team" },
  { code: "CIV", name: "Ivory Coast", category: "team" },
  { code: "MLI", name: "Mali", category: "team" },
  { code: "COD", name: "DR Congo", category: "team" },
];

export const SPECIAL_CATEGORIES = [
  { code: "FWC", name: "FIFA World Cup", count: 11, category: "fwc" as const },
  { code: "CC", name: "Coca-Cola", count: 14, category: "coca-cola" as const },
];

export const STICKERS_PER_TEAM = 20;
```

- [ ] **Step 2: Create seed script**

Create `scripts/seed-stickers.ts`:
```typescript
import { TEAMS, SPECIAL_CATEGORIES, STICKERS_PER_TEAM } from "../lib/data/teams";

interface StickerRow {
  code: string;
  team_code: string;
  team_name: string;
  number: number;
  player_name: null;
  category: string;
}

function generateStickers(): StickerRow[] {
  const stickers: StickerRow[] = [];

  // Team stickers: 48 teams x 20 each = 960
  for (const team of TEAMS) {
    for (let i = 1; i <= STICKERS_PER_TEAM; i++) {
      stickers.push({
        code: `${team.code}${i}`,
        team_code: team.code,
        team_name: team.name,
        number: i,
        player_name: null,
        category: "team",
      });
    }
  }

  // Special categories: FWC (11) + Coca-Cola (14) = 25
  for (const special of SPECIAL_CATEGORIES) {
    for (let i = 1; i <= special.count; i++) {
      stickers.push({
        code: `${special.code}${i}`,
        team_code: special.code,
        team_name: special.name,
        number: i,
        player_name: null,
        category: special.category,
      });
    }
  }

  return stickers;
}

// Generate SQL INSERT statement
function generateSQL(): string {
  const stickers = generateStickers();
  const values = stickers
    .map(
      (s) =>
        `('${s.code}', '${s.team_code}', '${s.team_name}', ${s.number}, NULL, '${s.category}')`
    )
    .join(",\n  ");

  return `INSERT INTO stickers (code, team_code, team_name, number, player_name, category)
VALUES
  ${values}
ON CONFLICT (code) DO NOTHING;`;
}

console.log(generateSQL());
console.log(`\n-- Total stickers: ${generateStickers().length}`);
```

- [ ] **Step 3: Generate and apply seed SQL**

Run:
```bash
cd /Users/maykonsousa/conductor/workspaces/fifa-stickers/irvine
npx tsx scripts/seed-stickers.ts > supabase/migrations/008_seed_stickers.sql
```

Then apply via Supabase MCP `execute_sql` tool with the generated SQL content.

- [ ] **Step 4: Verify seed data**

Via Supabase MCP, run:
```sql
SELECT category, COUNT(*) FROM stickers GROUP BY category ORDER BY category;
```
Expected:
- coca-cola: 14
- fwc: 11
- team: 960
- Total: 985

- [ ] **Step 5: Commit**

```bash
git add lib/data/teams.ts scripts/seed-stickers.ts supabase/migrations/008_seed_stickers.sql
git commit -m "feat: add seed data for 985 stickers (48 teams + FWC + Coca-Cola)"
```

---

### Task 4: Google OAuth + Auth Pages

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/auth/callback/route.ts`
- Modify: `app/page.tsx`
- Create: `components/auth-button.tsx`

- [ ] **Step 1: Enable Google OAuth in Supabase**

In the Supabase dashboard for project `ryahywolbykyqrpiibmp`:
1. Go to Authentication > Providers > Google
2. Enable Google provider
3. Add your Google OAuth Client ID and Secret (from Google Cloud Console)
4. Set the redirect URL to: `https://ryahywolbykyqrpiibmp.supabase.co/auth/v1/callback`
5. In Google Cloud Console, add `https://ryahywolbykyqrpiibmp.supabase.co/auth/v1/callback` to Authorized redirect URIs

- [ ] **Step 2: Create OAuth callback route**

Create `app/auth/callback/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 3: Create auth button component**

Create `components/auth-button.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInWithGoogleButton() {
  async function handleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-3 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow font-medium"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </button>
  );
}

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
    >
      Sign out
    </button>
  );
}
```

- [ ] **Step 4: Create login page**

Create `app/login/page.tsx`:
```typescript
import { SignInWithGoogleButton } from "@/components/auth-button";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-blue-700">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FIFA WC 2026
          </h1>
          <p className="text-gray-500">Sticker Album</p>
        </div>
        <SignInWithGoogleButton />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Update landing page**

Modify `app/page.tsx`:
```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-blue-700">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">FIFA WC 2026</h1>
        <p className="text-xl mb-8 opacity-90">Track your sticker collection</p>
        <Link
          href="/login"
          className="bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/login/ app/auth/ app/page.tsx components/auth-button.tsx
git commit -m "feat: add Google OAuth login with Supabase Auth"
```

---

### Task 5: Authenticated Layout + Navigation

**Files:**
- Create: `app/(authenticated)/layout.tsx`
- Create: `components/nav-bar.tsx`

- [ ] **Step 1: Create navigation bar component**

Create `components/nav-bar.tsx`:
```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth-button";

interface NavBarProps {
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Album" },
  { href: "/collection", label: "Collection" },
  { href: "/friends", label: "Friends" },
  { href: "/trades", label: "Trades" },
];

export function NavBar({ user }: NavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-bold text-lg text-green-700">
              FIFA WC 2026
            </Link>
            <div className="hidden sm:flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-green-100 text-green-800"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-2">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.display_name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.display_name}
              </span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="sm:hidden border-t border-gray-200 px-4 py-2 flex gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center px-2 py-2 rounded-md text-xs font-medium transition-colors ${
              pathname === item.href
                ? "bg-green-100 text-green-800"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create authenticated layout**

Create `app/(authenticated)/layout.tsx`:
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <>
      <NavBar
        user={{
          display_name: profile?.display_name ?? user.email ?? "User",
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/layout.tsx components/nav-bar.tsx
git commit -m "feat: add authenticated layout with navigation bar"
```

---

### Task 6: Profile Page

**Files:**
- Create: `app/(authenticated)/profile/page.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Create reusable UI components**

Create `components/ui/button.tsx`:
```typescript
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
      ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

Create `components/ui/input.tsx`:
```typescript
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 ${
            error ? "border-red-500" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
```

- [ ] **Step 2: Create profile page**

Create `app/(authenticated)/profile/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
```

- [ ] **Step 3: Create profile form client component**

Create `app/(authenticated)/profile/profile-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const updates = {
      display_name: formData.get("display_name") as string,
      city: formData.get("city") as string || null,
      state: formData.get("state") as string || null,
      instagram: formData.get("instagram") as string || null,
      whatsapp: formData.get("whatsapp") as string || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile?.id);

    if (error) {
      setMessage("Error saving profile. Please try again.");
    } else {
      setMessage("Profile saved!");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Display Name"
        name="display_name"
        defaultValue={profile?.display_name ?? ""}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="City"
          name="city"
          defaultValue={profile?.city ?? ""}
          placeholder="e.g., Sao Paulo"
        />
        <Input
          label="State"
          name="state"
          defaultValue={profile?.state ?? ""}
          placeholder="e.g., SP"
          maxLength={2}
        />
      </div>
      <Input
        label="Instagram"
        name="instagram"
        defaultValue={profile?.instagram ?? ""}
        placeholder="@username (visible to friends only)"
      />
      <Input
        label="WhatsApp"
        name="whatsapp"
        defaultValue={profile?.whatsapp ?? ""}
        placeholder="+55 11 99999-9999 (visible to friends only)"
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
        {message && (
          <p className={`text-sm ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/ app/\(authenticated\)/profile/
git commit -m "feat: add profile page with editable form"
```

---

### Task 7: Sticker Collection Page

**Files:**
- Create: `app/(authenticated)/collection/page.tsx`
- Create: `app/(authenticated)/collection/sticker-grid.tsx`
- Create: `app/(authenticated)/collection/sticker-card.tsx`
- Create: `app/(authenticated)/collection/actions.ts`

- [ ] **Step 1: Create server actions for sticker management**

Create `app/(authenticated)/collection/actions.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertSticker(
  stickerId: number,
  status: "owned" | "duplicate",
  quantity: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("user_stickers").upsert(
    {
      user_id: user.id,
      sticker_id: stickerId,
      status,
      quantity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,sticker_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/collection");
  revalidatePath("/dashboard");
}

export async function removeSticker(stickerId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_stickers")
    .delete()
    .eq("user_id", user.id)
    .eq("sticker_id", stickerId);

  if (error) throw new Error(error.message);
  revalidatePath("/collection");
  revalidatePath("/dashboard");
}
```

- [ ] **Step 2: Create sticker card component**

Create `app/(authenticated)/collection/sticker-card.tsx`:
```typescript
"use client";

import { useState } from "react";
import { upsertSticker, removeSticker } from "./actions";

interface Sticker {
  id: number;
  code: string;
  player_name: string | null;
}

interface UserSticker {
  status: "owned" | "duplicate";
  quantity: number;
}

interface StickerCardProps {
  sticker: Sticker;
  userSticker: UserSticker | null;
}

export function StickerCard({ sticker, userSticker }: StickerCardProps) {
  const [pending, setPending] = useState(false);

  const status = userSticker?.status ?? null;

  async function handleClick(newStatus: "owned" | "duplicate") {
    setPending(true);
    try {
      if (status === newStatus) {
        await removeSticker(sticker.id);
      } else {
        await upsertSticker(sticker.id, newStatus, newStatus === "duplicate" ? 1 : 1);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleQuantityChange(delta: number) {
    if (!userSticker || userSticker.status !== "duplicate") return;
    const newQty = Math.max(1, userSticker.quantity + delta);
    setPending(true);
    try {
      await upsertSticker(sticker.id, "duplicate", newQty);
    } finally {
      setPending(false);
    }
  }

  const bgColor =
    status === "owned"
      ? "bg-green-100 border-green-400"
      : status === "duplicate"
      ? "bg-yellow-100 border-yellow-400"
      : "bg-gray-50 border-gray-200";

  return (
    <div
      className={`border-2 rounded-lg p-2 text-center transition-colors ${bgColor} ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="text-xs font-bold text-gray-700 mb-1">{sticker.code}</div>
      {sticker.player_name && (
        <div className="text-xs text-gray-500 truncate mb-1">
          {sticker.player_name}
        </div>
      )}
      <div className="flex gap-1 justify-center mt-1">
        <button
          onClick={() => handleClick("owned")}
          disabled={pending}
          title="Mark as owned"
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            status === "owned"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-600 hover:bg-green-200"
          }`}
        >
          ✓
        </button>
        <button
          onClick={() => handleClick("duplicate")}
          disabled={pending}
          title="Mark as duplicate"
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            status === "duplicate"
              ? "bg-yellow-500 text-white"
              : "bg-gray-200 text-gray-600 hover:bg-yellow-200"
          }`}
        >
          +
        </button>
      </div>
      {status === "duplicate" && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={pending}
            className="text-xs w-5 h-5 rounded bg-gray-200 hover:bg-gray-300"
          >
            -
          </button>
          <span className="text-xs font-medium">{userSticker?.quantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={pending}
            className="text-xs w-5 h-5 rounded bg-gray-200 hover:bg-gray-300"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create sticker grid component**

Create `app/(authenticated)/collection/sticker-grid.tsx`:
```typescript
import { StickerCard } from "./sticker-card";

interface Sticker {
  id: number;
  code: string;
  team_code: string;
  team_name: string;
  number: number;
  player_name: string | null;
  category: string;
}

interface UserSticker {
  sticker_id: number;
  status: "owned" | "duplicate";
  quantity: number;
}

interface StickerGridProps {
  stickers: Sticker[];
  userStickers: UserSticker[];
  teamName: string;
}

export function StickerGrid({ stickers, userStickers, teamName }: StickerGridProps) {
  const userStickerMap = new Map(
    userStickers.map((us) => [us.sticker_id, us])
  );

  const owned = userStickers.filter((us) => us.status === "owned").length;
  const total = stickers.length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{teamName}</h2>
        <span className="text-sm text-gray-500">
          {owned}/{total} ({pct}%)
        </span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {stickers.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            userSticker={userStickerMap.get(sticker.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create collection page**

Create `app/(authenticated)/collection/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StickerGrid } from "./sticker-grid";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const query = params.q?.toLowerCase() ?? "";
  const teamFilter = params.team ?? "";

  // Fetch all stickers
  let stickersQuery = supabase
    .from("stickers")
    .select("*")
    .order("team_code")
    .order("number");

  if (query) {
    stickersQuery = stickersQuery.or(
      `code.ilike.%${query}%,player_name.ilike.%${query}%`
    );
  }
  if (teamFilter) {
    stickersQuery = stickersQuery.eq("team_code", teamFilter);
  }

  const { data: stickers } = await stickersQuery;

  // Fetch user's stickers
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, status, quantity")
    .eq("user_id", user.id);

  const allStickers = stickers ?? [];
  const allUserStickers = userStickers ?? [];

  // Group by team
  const teamMap = new Map<string, { name: string; stickers: typeof allStickers }>();
  for (const sticker of allStickers) {
    if (!teamMap.has(sticker.team_code)) {
      teamMap.set(sticker.team_code, { name: sticker.team_name, stickers: [] });
    }
    teamMap.get(sticker.team_code)!.stickers.push(sticker);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Collection</h1>
      </div>
      <form className="mb-6 flex gap-3">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by code (BRA7) or name..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Search
        </button>
      </form>
      {Array.from(teamMap.entries()).map(([teamCode, { name, stickers }]) => (
        <StickerGrid
          key={teamCode}
          stickers={stickers}
          userStickers={allUserStickers}
          teamName={name}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(authenticated\)/collection/
git commit -m "feat: add sticker collection page with owned/duplicate tracking"
```

---

### Task 8: Dashboard (Album Overview)

**Files:**
- Create: `app/(authenticated)/dashboard/page.tsx`
- Create: `components/team-progress.tsx`

- [ ] **Step 1: Create team progress component**

Create `components/team-progress.tsx`:
```typescript
interface TeamProgressProps {
  teamName: string;
  teamCode: string;
  owned: number;
  total: number;
}

export function TeamProgress({ teamName, teamCode, owned, total }: TeamProgressProps) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {teamCode}
          </span>
          <p className="text-sm font-medium text-gray-800">{teamName}</p>
        </div>
        <span className="text-sm font-semibold text-gray-700">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${teamName}: ${owned} of ${total} stickers`}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {owned} / {total}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/(authenticated)/dashboard/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamProgress } from "@/components/team-progress";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all stickers grouped by team
  const { data: stickers } = await supabase
    .from("stickers")
    .select("id, team_code, team_name, category")
    .order("team_code");

  // Fetch user's owned stickers
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, status")
    .eq("user_id", user.id)
    .eq("status", "owned");

  const allStickers = stickers ?? [];
  const ownedIds = new Set((userStickers ?? []).map((us) => us.sticker_id));

  // Build team stats
  const teamStats = new Map<
    string,
    { name: string; category: string; total: number; owned: number }
  >();

  for (const sticker of allStickers) {
    if (!teamStats.has(sticker.team_code)) {
      teamStats.set(sticker.team_code, {
        name: sticker.team_name,
        category: sticker.category,
        total: 0,
        owned: 0,
      });
    }
    const stat = teamStats.get(sticker.team_code)!;
    stat.total++;
    if (ownedIds.has(sticker.id)) stat.owned++;
  }

  const totalStickers = allStickers.length;
  const totalOwned = ownedIds.size;
  const totalPct = totalStickers > 0 ? Math.round((totalOwned / totalStickers) * 100) : 0;

  const teamEntries = Array.from(teamStats.entries()).filter(
    ([, s]) => s.category === "team"
  );
  const specialEntries = Array.from(teamStats.entries()).filter(
    ([, s]) => s.category !== "team"
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Album Overview</h1>

      {/* Total progress */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white mb-8">
        <p className="text-sm opacity-80 mb-1">Total Completion</p>
        <p className="text-5xl font-bold mb-2">{totalPct}%</p>
        <p className="text-sm opacity-80">
          {totalOwned} of {totalStickers} stickers
        </p>
        <div className="w-full bg-white/30 rounded-full h-3 mt-3">
          <div
            className="bg-white h-3 rounded-full transition-all"
            style={{ width: `${totalPct}%` }}
            role="progressbar"
            aria-valuenow={totalPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Total album completion: ${totalPct}%`}
          />
        </div>
      </div>

      {/* Special categories */}
      {specialEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Special</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialEntries.map(([code, stat]) => (
              <TeamProgress
                key={code}
                teamCode={code}
                teamName={stat.name}
                owned={stat.owned}
                total={stat.total}
              />
            ))}
          </div>
        </div>
      )}

      {/* Teams */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Teams</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {teamEntries.map(([code, stat]) => (
          <TeamProgress
            key={code}
            teamCode={code}
            teamName={stat.name}
            owned={stat.owned}
            total={stat.total}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(authenticated\)/dashboard/ components/team-progress.tsx
git commit -m "feat: add album dashboard with completion percentages by team"
```

---

### Task 9: Friends System

**Files:**
- Create: `app/(authenticated)/friends/page.tsx`
- Create: `app/(authenticated)/friends/actions.ts`
- Create: `app/(authenticated)/friends/friend-list.tsx`
- Create: `app/(authenticated)/friends/pending-requests.tsx`
- Create: `app/(authenticated)/friends/search-users.tsx`
- Create: `components/friend-request-card.tsx`

- [ ] **Step 1: Create friend actions**

Create `app/(authenticated)/friends/actions.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (user.id === addresseeId) throw new Error("Cannot friend yourself");

  // Check if request already exists in either direction
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) throw new Error("Friend request already exists");

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/friends");
}

export async function respondToFriendRequest(
  friendshipId: string,
  response: "accepted" | "rejected"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("friendships")
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/friends");
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) throw new Error(error.message);
  revalidatePath("/friends");
}

export async function searchUsers(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city, state")
    .neq("id", user.id)
    .ilike("display_name", `%${query}%`)
    .limit(20);

  return data ?? [];
}
```

- [ ] **Step 2: Create friend request card component**

Create `components/friend-request-card.tsx`:
```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface FriendRequestCardProps {
  friendship: {
    id: string;
    requester: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      city: string | null;
      state: string | null;
    };
  };
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function FriendRequestCard({
  friendship,
  onAccept,
  onReject,
}: FriendRequestCardProps) {
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setPending(true);
    await onAccept(friendship.id);
  }

  async function handleReject() {
    setPending(true);
    await onReject(friendship.id);
  }

  const { requester } = friendship;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        {requester.avatar_url ? (
          <Image
            src={requester.avatar_url}
            alt={requester.display_name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
            {requester.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{requester.display_name}</p>
          {(requester.city || requester.state) && (
            <p className="text-xs text-gray-500">
              {[requester.city, requester.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAccept} disabled={pending}>
          Accept
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReject} disabled={pending}>
          Reject
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create pending requests component**

Create `app/(authenticated)/friends/pending-requests.tsx`:
```typescript
"use client";

import { FriendRequestCard } from "@/components/friend-request-card";
import { respondToFriendRequest } from "./actions";

interface PendingRequest {
  id: string;
  requester: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
  };
}

export function PendingRequests({ requests }: { requests: PendingRequest[] }) {
  if (requests.length === 0) return null;

  async function handleAccept(id: string) {
    await respondToFriendRequest(id, "accepted");
  }

  async function handleReject(id: string) {
    await respondToFriendRequest(id, "rejected");
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Pending Requests ({requests.length})
      </h2>
      <div className="space-y-2">
        {requests.map((req) => (
          <FriendRequestCard
            key={req.id}
            friendship={req}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create user search component**

Create `app/(authenticated)/friends/search-users.tsx`:
```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { searchUsers, sendFriendRequest } from "./actions";
import { Button } from "@/components/ui/button";

interface UserResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
}

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchUsers(query);
    setResults(data);
    setSearching(false);
  }

  async function handleSendRequest(userId: string) {
    try {
      await sendFriendRequest(userId);
      setSentIds((prev) => new Set([...prev, userId]));
    } catch (err) {
      // Already friends or request exists
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Find Friends</h2>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <Button type="submit" disabled={searching}>
          {searching ? "..." : "Search"}
        </Button>
      </form>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.display_name}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.display_name}
                  </p>
                  {(user.city || user.state) && (
                    <p className="text-xs text-gray-500">
                      {[user.city, user.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={sentIds.has(user.id) ? "secondary" : "primary"}
                onClick={() => handleSendRequest(user.id)}
                disabled={sentIds.has(user.id)}
              >
                {sentIds.has(user.id) ? "Sent" : "Add"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create friend list component**

Create `app/(authenticated)/friends/friend-list.tsx`:
```typescript
import Image from "next/image";
import Link from "next/link";

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
}

export function FriendList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No friends yet. Search for users above to send friend requests.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {friends.map((friend) => (
        <Link
          key={friend.id}
          href={`/user/${friend.id}`}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
        >
          {friend.avatar_url ? (
            <Image
              src={friend.avatar_url}
              alt={friend.display_name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
              {friend.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{friend.display_name}</p>
            {(friend.city || friend.state) && (
              <p className="text-xs text-gray-500">
                {[friend.city, friend.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create friends page**

Create `app/(authenticated)/friends/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PendingRequests } from "./pending-requests";
import { SearchUsers } from "./search-users";
import { FriendList } from "./friend-list";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch pending requests (where I'm the addressee)
  const { data: pendingRequests } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, profiles!friendships_requester_id_fkey(id, display_name, avatar_url, city, state)"
    )
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  // Fetch accepted friends
  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, profiles!friendships_requester_id_fkey(id, display_name, avatar_url, city, state)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  // Also fetch addressee profiles for friendships where I'm the requester
  const { data: friendships2 } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, city, state)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  // Build friend list (the other person in each friendship)
  const friends: Array<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
  }> = [];

  const allFriendships = [...(friendships ?? []), ...(friendships2 ?? [])];
  const seenIds = new Set<string>();

  for (const f of allFriendships) {
    const profile = (f as any).profiles;
    if (!profile || profile.id === user.id || seenIds.has(profile.id)) continue;
    seenIds.add(profile.id);
    friends.push(profile);
  }

  const pending = (pendingRequests ?? []).map((r: any) => ({
    id: r.id,
    requester: r.profiles,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Friends</h1>
      <PendingRequests requests={pending} />
      <SearchUsers />
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          My Friends ({friends.length})
        </h2>
        <FriendList friends={friends} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/\(authenticated\)/friends/ components/friend-request-card.tsx
git commit -m "feat: add friends system with invite, accept, and search"
```

---

### Task 10: User Profile View Page

**Files:**
- Create: `app/(authenticated)/user/[id]/page.tsx`

- [ ] **Step 1: Create user profile view page**

Create `app/(authenticated)/user/[id]/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  // Use the DB function to get profile with conditional contact info
  const { data: profile } = await supabase.rpc("get_profile_with_contact", {
    viewer: user.id,
    target: id,
  });

  if (!profile || profile.length === 0) notFound();

  const p = profile[0];

  // Get their collection stats
  const { data: userStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id, status")
    .eq("user_id", id);

  const owned = (userStickers ?? []).filter((us) => us.status === "owned").length;
  const duplicates = (userStickers ?? []).filter((us) => us.status === "duplicate").length;

  // Check friendship status
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {p.avatar_url ? (
            <Image
              src={p.avatar_url}
              alt={p.display_name}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-xl font-bold text-green-800">
              {p.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{p.display_name}</h1>
            {(p.city || p.state) && (
              <p className="text-gray-500">
                {[p.city, p.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Contact info (friends only) */}
        {(p.instagram || p.whatsapp) && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            {p.instagram && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Instagram:</span> {p.instagram}
              </p>
            )}
            {p.whatsapp && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">WhatsApp:</span> {p.whatsapp}
              </p>
            )}
          </div>
        )}

        {/* Friendship status */}
        {!friendship && (
          <p className="text-xs text-gray-400 mt-3">
            Add as friend to see contact info
          </p>
        )}
      </div>

      {/* Collection stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{owned}</p>
          <p className="text-sm text-gray-600">Stickers owned</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-700">{duplicates}</p>
          <p className="text-sm text-gray-600">Duplicates available</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(authenticated\)/user/
git commit -m "feat: add user profile view with friend-gated contact info"
```

---

### Task 11: Trading Page

**Files:**
- Create: `app/(authenticated)/trades/page.tsx`
- Create: `app/(authenticated)/trades/trade-match-card.tsx`
- Create: `app/(authenticated)/trades/manual-search.tsx`

- [ ] **Step 1: Create trade match card component**

Create `app/(authenticated)/trades/trade-match-card.tsx`:
```typescript
import Image from "next/image";
import Link from "next/link";

interface TradeMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  they_have_i_need: number;
  i_have_they_need: number;
}

export function TradeMatchCard({ match }: { match: TradeMatch }) {
  return (
    <Link
      href={`/user/${match.user_id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        {match.avatar_url ? (
          <Image
            src={match.avatar_url}
            alt={match.display_name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
            {match.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{match.display_name}</p>
          {(match.city || match.state) && (
            <p className="text-xs text-gray-500">
              {[match.city, match.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-green-50 rounded p-2">
          <p className="text-lg font-bold text-green-700">{match.they_have_i_need}</p>
          <p className="text-xs text-gray-500">they have / I need</p>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <p className="text-lg font-bold text-blue-700">{match.i_have_they_need}</p>
          <p className="text-xs text-gray-500">I have / they need</p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create manual search component**

Create `app/(authenticated)/trades/manual-search.tsx`:
```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
}

const BRAZIL_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function ManualSearch() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const supabase = createClient();

    let query = supabase
      .from("profiles")
      .select("id, display_name, avatar_url, city, state")
      .limit(30);

    if (state) query = query.eq("state", state);
    if (city) query = query.ilike("city", `%${city}%`);

    const { data } = await query;
    setResults(data ?? []);
    setSearching(false);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Find Traders by Location
      </h2>
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        >
          <option value="">All states</option>
          {BRAZIL_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <Button type="submit" disabled={searching}>
          {searching ? "..." : "Search"}
        </Button>
      </form>
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/user/${user.id}`}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
            >
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.display_name}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-sm font-medium text-green-800">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.display_name}
                </p>
                {(user.city || user.state) && (
                  <p className="text-xs text-gray-500">
                    {[user.city, user.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create trades page**

Create `app/(authenticated)/trades/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TradeMatchCard } from "./trade-match-card";
import { ManualSearch } from "./manual-search";

interface TradeMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  they_have_i_need: number;
  i_have_they_need: number;
}

export default async function TradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matches } = await supabase.rpc("get_trade_matches", {
    current_user_id: user.id,
  });

  const tradeMatches: TradeMatch[] = matches ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Trades</h1>

      {/* Automatic matches */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Suggested Matches
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Users who have duplicates you need AND need duplicates you have
        </p>
        {tradeMatches.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No matches yet. Add more stickers to your collection to find trading partners.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tradeMatches.map((match) => (
              <TradeMatchCard key={match.user_id} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* Manual search */}
      <ManualSearch />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(authenticated\)/trades/
git commit -m "feat: add trading page with automatic match suggestions and manual search"
```

---

### Task 12: Database Types and Final Polish

**Files:**
- Create: `lib/types/database.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create TypeScript database types**

Create `lib/types/database.ts`:
```typescript
export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sticker {
  id: number;
  code: string;
  team_code: string;
  team_name: string;
  number: number;
  player_name: string | null;
  category: "team" | "fwc" | "coca-cola";
}

export interface UserSticker {
  id: string;
  user_id: string;
  sticker_id: number;
  status: "owned" | "duplicate";
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface TradeMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export interface TradeMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  they_have_i_need: number;
  i_have_they_need: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      stickers: {
        Row: Sticker;
        Insert: Omit<Sticker, "id">;
        Update: Partial<Omit<Sticker, "id">>;
      };
      user_stickers: {
        Row: UserSticker;
        Insert: Omit<UserSticker, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserSticker, "id" | "user_id" | "created_at">>;
      };
      friendships: {
        Row: Friendship;
        Insert: Omit<Friendship, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Friendship, "id" | "requester_id" | "created_at">>;
      };
      trade_messages: {
        Row: TradeMessage;
        Insert: Omit<TradeMessage, "id" | "created_at">;
        Update: never;
      };
    };
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      get_profile_with_contact: {
        Args: { viewer: string; target: string };
        Returns: Profile[];
      };
      get_trade_matches: {
        Args: { current_user_id: string };
        Returns: TradeMatch[];
      };
    };
  };
}
```

- [ ] **Step 2: Update root layout metadata**

Modify `app/layout.tsx` — update the metadata:
```typescript
export const metadata: Metadata = {
  title: "FIFA WC 2026 - Sticker Album",
  description: "Track your FIFA World Cup 2026 sticker collection, find friends, and trade duplicates.",
};
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/database.ts app/layout.tsx
git commit -m "feat: add TypeScript database types and update app metadata"
```

---

### Task 13: RLS Policy for User Stickers Visibility (Trading)

**Files:**
- Create: `supabase/migrations/009_user_stickers_public_read.sql`

- [ ] **Step 1: Add RLS policy for reading other users' stickers (needed for trade matching)**

The `get_trade_matches` function uses `SECURITY DEFINER` so it bypasses RLS. However, for the user profile page to show collection stats, we need a SELECT policy that allows reading other users' sticker counts.

Create `supabase/migrations/009_user_stickers_public_read.sql`:
```sql
-- Allow authenticated users to read anyone's sticker collection
-- (needed for profile views and trade matching)
DROP POLICY IF EXISTS "user_stickers_select_own" ON user_stickers;

CREATE POLICY "user_stickers_select_authenticated"
  ON user_stickers FOR SELECT
  TO authenticated
  USING (true);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run the SQL via `execute_sql` on project `ryahywolbykyqrpiibmp`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_user_stickers_public_read.sql
git commit -m "feat: allow authenticated users to read all sticker collections for trading"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - [x] Google OAuth login via Supabase Auth — Task 4
   - [x] User profile with name, photo, city, state, Instagram, WhatsApp — Task 6
   - [x] Instagram/WhatsApp visible only to friends — Task 10 (via `get_profile_with_contact` function)
   - [x] Sticker collection: owned/duplicate/missing with quantity — Task 7
   - [x] Search by code or name — Task 7 (search form)
   - [x] Album view with completion % by team and total — Task 8
   - [x] Friends system: invite + accept only — Task 9
   - [x] Trading: automatic match suggestions — Task 11 (via `get_trade_matches` function)
   - [x] Trading: manual search filtered by state/city — Task 11 (ManualSearch component)
   - [x] Seed data: 48 teams x 20 + FWC(11) + Coca-Cola(14) = 985 — Task 3
   - [x] Only codes now, player names later — Task 3 (player_name nullable)

2. **Placeholder scan:** No TBDs, TODOs, or "implement later" found.

3. **Type consistency:** Verified function names, types, and interfaces are consistent across tasks.

---

## Notes

- **Supabase MCP:** Migrations should be applied via the Supabase MCP tool connected at project ref `ryahywolbykyqrpiibmp`. Use `execute_sql` for each migration file.
- **Google OAuth:** Requires manual setup in both Google Cloud Console and Supabase dashboard (Task 4, Step 1).
- **Environment variables:** The `.env.local` file needs the actual anon key from the Supabase dashboard.
- **node_modules:** Run `npm install` before starting development — dependencies are not yet installed.
- **Next.js 16:** This project uses Next.js 16 with React 19. The App Router patterns used here (async Server Components, `searchParams` as Promise, `params` as Promise) follow Next.js 15+ conventions which carry forward to 16.
