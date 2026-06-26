-- INSERT exige que album_id pertença ao usuário.
DROP POLICY IF EXISTS "user_stickers_insert_own" ON user_stickers;
CREATE POLICY "user_stickers_insert_own"
  ON user_stickers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM albums a WHERE a.id = album_id AND a.user_id = auth.uid())
  );
-- DELETE/SELECT permanecem por user_id (já cobrem o dono).

-- Trocas: cada lado mexe no SEU álbum público.
CREATE OR REPLACE FUNCTION add_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_album_id INT;
BEGIN
  SELECT public_album_id INTO v_album_id FROM profiles WHERE id = p_user_id;
  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'user % has no public album', p_user_id;
  END IF;
  INSERT INTO user_stickers (user_id, sticker_id, album_id)
  SELECT p_user_id, p_sticker_id, v_album_id
  FROM generate_series(1, p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION remove_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_album_id INT;
BEGIN
  SELECT public_album_id INTO v_album_id FROM profiles WHERE id = p_user_id;
  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'user % has no public album', p_user_id;
  END IF;
  DELETE FROM user_stickers
  WHERE id IN (
    SELECT id FROM user_stickers
    WHERE user_id = p_user_id AND sticker_id = p_sticker_id AND album_id = v_album_id
    LIMIT p_quantity
  );
END;
$$;

-- Bulk-insert do wizard de troca: vai para o álbum ATIVO do iniciador.
CREATE OR REPLACE FUNCTION add_stickers_to_collection(p_sticker_ids INT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_album_id INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  SELECT active_album_id INTO v_album_id FROM profiles WHERE id = v_user_id;
  IF v_album_id IS NULL THEN
    RAISE EXCEPTION 'user has no active album';
  END IF;
  INSERT INTO user_stickers (user_id, sticker_id, album_id)
  SELECT v_user_id, sticker_id, v_album_id FROM unnest(p_sticker_ids) AS sticker_id;
END;
$$;
