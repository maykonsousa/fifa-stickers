-- Contagem passa a ser por álbum. profiles.sticker_count espelha o álbum público
-- (mantém /players e perfil público corretos sem mudar essas queries).
CREATE OR REPLACE FUNCTION update_profile_sticker_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_album_id INT := COALESCE(NEW.album_id, OLD.album_id);
  v_user_id  UUID := COALESCE(NEW.user_id, OLD.user_id);
  v_count    INT;
BEGIN
  SELECT COUNT(DISTINCT sticker_id) INTO v_count
  FROM public.user_stickers WHERE album_id = v_album_id;

  UPDATE public.albums SET sticker_count = v_count WHERE id = v_album_id;

  -- Se o álbum afetado é o público do usuário, espelha no profile.
  UPDATE public.profiles
  SET sticker_count = v_count
  WHERE id = v_user_id AND public_album_id = v_album_id;

  RETURN NULL;
END;
$$;
-- Trigger on_user_sticker_change já existe (migration 024) e continua apontando
-- para esta função; não precisa recriar.
