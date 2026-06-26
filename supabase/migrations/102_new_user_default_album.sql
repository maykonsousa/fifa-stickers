-- Novo signup nasce com um álbum padrão + ponteiros ativos/público.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base_name TEXT;
  new_username TEXT;
  v_album_id INT;
BEGIN
  base_name := LOWER(REGEXP_REPLACE(
    LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 6),
    '[^a-z0-9]', '', 'g'
  ));
  new_username := base_name || SUBSTR(MD5(NEW.id::TEXT), 1, 14 - LENGTH(base_name));

  INSERT INTO public.profiles (id, display_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    new_username
  );

  INSERT INTO public.albums (user_id, name, template)
  VALUES (NEW.id, 'Meu Álbum - 001', 'copa-2026')
  RETURNING id INTO v_album_id;

  UPDATE public.profiles
  SET active_album_id = v_album_id, public_album_id = v_album_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
