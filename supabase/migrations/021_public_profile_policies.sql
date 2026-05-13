-- Permitir leitura pública de perfis (para /p/[username])
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT TO anon
  USING (true);

-- Permitir leitura pública de stickers e grupos (para mostrar progresso)
CREATE POLICY "stickers_select_public"
  ON stickers FOR SELECT TO anon
  USING (true);

CREATE POLICY "sticker_groups_select_public"
  ON sticker_groups FOR SELECT TO anon
  USING (true);

CREATE POLICY "user_stickers_select_public"
  ON user_stickers FOR SELECT TO anon
  USING (true);
