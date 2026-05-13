# Admin Responsiveness

## Summary

Make the admin layout and routes fully responsive on mobile. Three changes:

1. Admin nav gets a hamburger menu on mobile (matching the user-facing NavBar pattern)
2. Users table becomes cards on mobile
3. Invites table becomes cards on mobile

## 1. Admin Nav — Mobile Drawer

**File:** `app/admin/(dashboard)/layout.tsx`

Convert to a client component (or extract nav into a client component) to support mobile menu state.

**Desktop (≥ sm):** Keep current horizontal nav unchanged.

**Mobile (< sm):**
- Hide horizontal nav links
- Show hamburger button (Menu icon from lucide-react)
- On tap, open a right-side drawer (same pattern as `components/nav-bar.tsx` MobileDrawer)
- Drawer contains: header with "Admin" title + close button, then all 5 nav links (Dashboard, Figurinhas, Upload, Usuários, Convites) as vertical items
- Drawer closes on link tap and on backdrop tap
- Body scroll locked while open

**Implementation approach:** Extract the nav into a separate `AdminNav` client component. The layout remains a server component that does auth checks and renders `<AdminNav />` + `{children}`.

## 2. Users — Card Layout on Mobile

**File:** `app/admin/(dashboard)/users/page.tsx`

**Desktop (≥ sm):** Keep current table with `hidden sm:block`.

**Mobile (< sm):** Show with `sm:hidden`. Render a vertical list of cards:
- Each card: rounded-lg, border border-gray-700, bg-gray-800, p-4
- Content: avatar (h-10 w-10) + display_name on top row, city/state and date below as secondary text
- Same data, just reformatted for vertical scanning

## 3. Invites — Card Layout on Mobile

**File:** `app/admin/(dashboard)/invites/invites-admin.tsx`

**Desktop (≥ sm):** Keep current table with `hidden sm:block`.

**Mobile (< sm):** Show with `sm:hidden`. Render a vertical list of cards:
- Each card: rounded-lg, border border-gray-700, bg-gray-800, p-4
- Content: email (bold, white), status badge inline, dates as secondary text below
- Same data, reformatted

## What Doesn't Change

- Stickers grid (already responsive)
- Upload page (already responsive)
- Edit dialog (already max-w-md centered)
- Invite creation form (flex inline, works fine)
- Dashboard stats grid (already uses sm:grid-cols-2 lg:grid-cols-4)

## Breakpoint

All changes use `sm` (640px) as the mobile/desktop boundary, consistent with the rest of the app.
