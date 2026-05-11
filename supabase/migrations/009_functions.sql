-- Check if two users are active friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends
    WHERE user_id = user_a AND friend_id = user_b AND status = 'active'
  );
$$;

-- Accept a friend invite: update invite + create 2 friend rows
CREATE OR REPLACE FUNCTION accept_friend_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender UUID;
  v_receiver UUID;
BEGIN
  SELECT sender_id, receiver_id INTO v_sender, v_receiver
  FROM friend_invites
  WHERE id = invite_id AND status = 'pending' AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or not authorized';
  END IF;

  UPDATE friend_invites SET status = 'accepted', updated_at = now() WHERE id = invite_id;

  INSERT INTO friends (user_id, friend_id, status)
  VALUES (v_sender, v_receiver, 'active')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'active', updated_at = now();

  INSERT INTO friends (user_id, friend_id, status)
  VALUES (v_receiver, v_sender, 'active')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'active', updated_at = now();
END;
$$;

-- Block a friend
CREATE OR REPLACE FUNCTION block_friend(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE friends
  SET status = 'blocked', updated_at = now()
  WHERE user_id = auth.uid() AND friend_id = target_id;
END;
$$;

-- Unblock a friend
CREATE OR REPLACE FUNCTION unblock_friend(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE friends
  SET status = 'active', updated_at = now()
  WHERE user_id = auth.uid() AND friend_id = target_id AND status = 'blocked';
END;
$$;

-- Remove a friend (both sides)
CREATE OR REPLACE FUNCTION remove_friend(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE friends
  SET status = 'removed', updated_at = now()
  WHERE (user_id = auth.uid() AND friend_id = target_id)
     OR (user_id = target_id AND friend_id = auth.uid());
END;
$$;

-- Get profile with contact info gated by friendship
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
  they_have_i_need BIGINT,
  i_have_they_need BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH my_owned AS (
    SELECT DISTINCT sticker_id FROM user_stickers WHERE user_id = current_user_id
  ),
  my_duplicates AS (
    SELECT sticker_id FROM user_stickers
    WHERE user_id = current_user_id
    GROUP BY sticker_id HAVING COUNT(*) > 1
  ),
  my_missing AS (
    SELECT s.id AS sticker_id FROM stickers s
    WHERE NOT EXISTS (
      SELECT 1 FROM my_owned mo WHERE mo.sticker_id = s.id
    )
  ),
  other_duplicates AS (
    SELECT us.user_id, us.sticker_id
    FROM user_stickers us
    WHERE us.user_id <> current_user_id
    GROUP BY us.user_id, us.sticker_id HAVING COUNT(*) > 1
  ),
  other_missing AS (
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
    COUNT(DISTINCT od.sticker_id) FILTER (
      WHERE od.sticker_id IN (SELECT sticker_id FROM my_missing)
    ) AS they_have_i_need,
    COUNT(DISTINCT md.sticker_id) FILTER (
      WHERE md.sticker_id IN (SELECT sticker_id FROM other_missing om WHERE om.user_id = p.id)
    ) AS i_have_they_need
  FROM profiles p
  LEFT JOIN other_duplicates od ON od.user_id = p.id
  LEFT JOIN my_duplicates md ON TRUE
  WHERE p.id <> current_user_id
  AND NOT EXISTS (
    SELECT 1 FROM friends
    WHERE user_id = p.id AND friend_id = current_user_id AND status = 'blocked'
  )
  GROUP BY p.id, p.display_name, p.avatar_url, p.city, p.state
  HAVING
    COUNT(DISTINCT od.sticker_id) FILTER (
      WHERE od.sticker_id IN (SELECT sticker_id FROM my_missing)
    ) > 0
    OR COUNT(DISTINCT md.sticker_id) FILTER (
      WHERE md.sticker_id IN (SELECT sticker_id FROM other_missing om WHERE om.user_id = p.id)
    ) > 0
  ORDER BY (
    COUNT(DISTINCT od.sticker_id) FILTER (WHERE od.sticker_id IN (SELECT sticker_id FROM my_missing))
    + COUNT(DISTINCT md.sticker_id) FILTER (WHERE md.sticker_id IN (SELECT sticker_id FROM other_missing om WHERE om.user_id = p.id))
  ) DESC;
$$;
