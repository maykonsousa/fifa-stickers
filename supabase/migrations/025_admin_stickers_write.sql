-- Allow admins to INSERT new stickers and to UPDATE the per-group counter.
-- Read-only policies remain in migrations 008 and 021.

DROP POLICY IF EXISTS "stickers_insert_admin" ON stickers;
CREATE POLICY "stickers_insert_admin"
  ON stickers FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "sticker_groups_update_admin" ON sticker_groups;
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
