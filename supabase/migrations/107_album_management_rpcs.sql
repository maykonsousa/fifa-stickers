CREATE OR REPLACE FUNCTION create_album(p_name TEXT)
RETURNS albums
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_album albums;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'album name required';
  END IF;
  INSERT INTO albums (user_id, name, template)
  VALUES (v_user_id, btrim(p_name), 'copa-2026')
  RETURNING * INTO v_album;
  RETURN v_album;
END;
$$;
GRANT EXECUTE ON FUNCTION create_album(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION rename_album(p_album_id INT, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'album name required';
  END IF;
  UPDATE albums SET name = btrim(p_name)
  WHERE id = p_album_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'album not found or not owned'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rename_album(INT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION delete_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_public BOOLEAN;
  v_total INT;
BEGIN
  SELECT (public_album_id = p_album_id) INTO v_is_public FROM profiles WHERE id = v_user_id;
  IF v_is_public THEN RAISE EXCEPTION 'cannot delete public album'; END IF;
  SELECT COUNT(*) INTO v_total FROM albums WHERE user_id = v_user_id;
  IF v_total <= 1 THEN RAISE EXCEPTION 'cannot delete the only album'; END IF;
  DELETE FROM albums WHERE id = p_album_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'album not found or not owned'; END IF;
  -- Se o ativo era esse, cair no público.
  UPDATE profiles SET active_album_id = public_album_id
  WHERE id = v_user_id AND active_album_id = p_album_id;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_album(INT) TO authenticated;

CREATE OR REPLACE FUNCTION set_active_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'album not found or not owned';
  END IF;
  UPDATE profiles SET active_album_id = p_album_id WHERE id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION set_active_album(INT) TO authenticated;

CREATE OR REPLACE FUNCTION set_public_album(p_album_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'album not found or not owned';
  END IF;
  UPDATE profiles SET public_album_id = p_album_id WHERE id = v_user_id;
  -- Ressincroniza profiles.sticker_count com o novo álbum público.
  SELECT sticker_count INTO v_count FROM albums WHERE id = p_album_id;
  UPDATE profiles SET sticker_count = COALESCE(v_count, 0) WHERE id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION set_public_album(INT) TO authenticated;
