-- Multi-álbum (Etapa 1): tabela de álbuns + escopo de álbum em user_stickers + ponteiros no profile.
-- Catálogo (stickers/sticker_groups) permanece global. 'template' é gancho p/ modalidades futuras.

CREATE TABLE IF NOT EXISTS albums (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  template      TEXT NOT NULL DEFAULT 'copa-2026',
  sticker_count INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);

ALTER TABLE user_stickers ADD COLUMN IF NOT EXISTS album_id INT REFERENCES albums(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_stickers_album_id ON user_stickers(album_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_album_id INT REFERENCES albums(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_album_id INT REFERENCES albums(id);

-- RLS: álbum é legível por todos (perfil público lê nome/count de outros);
-- só o dono escreve.
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_select_all" ON albums;
CREATE POLICY "albums_select_all"
  ON albums FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "albums_insert_own" ON albums;
CREATE POLICY "albums_insert_own"
  ON albums FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_update_own" ON albums;
CREATE POLICY "albums_update_own"
  ON albums FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "albums_delete_own" ON albums;
CREATE POLICY "albums_delete_own"
  ON albums FOR DELETE TO authenticated USING (auth.uid() = user_id);
