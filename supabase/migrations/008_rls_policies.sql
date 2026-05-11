ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_messages ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- sticker_groups
CREATE POLICY "sticker_groups_select_authenticated"
  ON sticker_groups FOR SELECT TO authenticated USING (true);

-- stickers
CREATE POLICY "stickers_select_authenticated"
  ON stickers FOR SELECT TO authenticated USING (true);

-- user_stickers: anyone can read (needed for trade matching), only own can write
CREATE POLICY "user_stickers_select_authenticated"
  ON user_stickers FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_stickers_insert_own"
  ON user_stickers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stickers_delete_own"
  ON user_stickers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- friend_invites
CREATE POLICY "friend_invites_select_own"
  ON friend_invites FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "friend_invites_insert_as_sender"
  ON friend_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "friend_invites_update_as_receiver"
  ON friend_invites FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- friends: only see own rows
CREATE POLICY "friends_select_own"
  ON friends FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "friends_update_own"
  ON friends FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- trade_messages
CREATE POLICY "trade_messages_select_own"
  ON trade_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "trade_messages_insert_as_sender"
  ON trade_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
