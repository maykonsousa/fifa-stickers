-- lookup_sticker_by_code passa a contar cópias dentro do álbum (multi-álbum).
DROP FUNCTION IF EXISTS lookup_sticker_by_code(TEXT, UUID);

CREATE FUNCTION lookup_sticker_by_code(p_code TEXT, p_album_id INT)
RETURNS TABLE (
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  owned_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    (
      SELECT COUNT(*)::INT
      FROM public.user_stickers us
      WHERE us.sticker_id = s.id AND us.album_id = p_album_id
    ) AS owned_count
  FROM public.stickers s
  WHERE s.code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_sticker_by_code(TEXT, INT) TO authenticated, anon;
