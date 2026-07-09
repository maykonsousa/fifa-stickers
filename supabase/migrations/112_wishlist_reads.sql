-- search_stickers passa a expor `wishlisted` e o status 'preciso' (faltam + desejos).
DROP FUNCTION IF EXISTS search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT);

CREATE FUNCTION search_stickers(
  p_album_id INT,
  p_keyword TEXT DEFAULT NULL,
  p_group_id INT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  group_id INT,
  code TEXT,
  number INT,
  title TEXT,
  image_url TEXT,
  owned_count BIGINT,
  total_count BIGINT,
  viewer_owned_count BIGINT,
  wishlisted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  ),
  viewer_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM user_stickers us
    WHERE p_viewer_album_id IS NOT NULL AND us.album_id = p_viewer_album_id
    GROUP BY us.sticker_id
  ),
  wishlist AS (
    SELECT aw.sticker_id
    FROM album_wishlist aw
    WHERE aw.album_id = p_album_id
  )
  SELECT
    s.id,
    s.group_id,
    s.code,
    s.number,
    s.title,
    s.image_url,
    COALESCE(uc.cnt, 0) AS owned_count,
    COUNT(*) OVER() AS total_count,
    COALESCE(vc.cnt, 0) AS viewer_owned_count,
    (w.sticker_id IS NOT NULL) AS wishlisted
  FROM stickers s
  LEFT JOIN user_counts uc ON uc.sticker_id = s.id
  LEFT JOIN viewer_counts vc ON vc.sticker_id = s.id
  LEFT JOIN wishlist w ON w.sticker_id = s.id
  WHERE
    (p_keyword IS NULL OR unaccent(s.code) ILIKE '%' || unaccent(p_keyword) || '%' OR unaccent(COALESCE(s.title, '')) ILIKE '%' || unaccent(p_keyword) || '%')
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (
      p_status IS NULL
      OR (p_status = 'owned' AND COALESCE(uc.cnt, 0) > 0)
      OR (p_status = 'missing' AND COALESCE(uc.cnt, 0) = 0)
      OR (p_status = 'duplicate' AND COALESCE(uc.cnt, 0) > 1)
      OR (p_status = 'preciso' AND (COALESCE(uc.cnt, 0) = 0 OR w.sticker_id IS NOT NULL))
    )
  ORDER BY s.group_id, s.number
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION search_stickers(INT, TEXT, INT, TEXT, INT, INT, INT) TO authenticated;

-- get_user_share_list: a lista "faltam" vira "preciso" (faltantes + desejos).
DROP FUNCTION IF EXISTS get_user_share_list(INT, TEXT);

CREATE FUNCTION get_user_share_list(p_album_id INT, p_kind TEXT)
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT,
  count INT
)
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  WITH counts AS (
    SELECT sticker_id, COUNT(*)::INT AS cnt
    FROM public.user_stickers
    WHERE album_id = p_album_id
    GROUP BY sticker_id
  ),
  wishlist AS (
    SELECT sticker_id
    FROM public.album_wishlist
    WHERE album_id = p_album_id
  )
  SELECT
    s.group_id,
    g.name AS group_name,
    g.code AS group_code,
    s.id AS sticker_id,
    s.code AS sticker_code,
    s.number AS sticker_number,
    s.title AS sticker_title,
    COALESCE(c.cnt, 0) AS count
  FROM public.stickers s
  JOIN public.sticker_groups g ON g.id = s.group_id
  LEFT JOIN counts c ON c.sticker_id = s.id
  LEFT JOIN wishlist w ON w.sticker_id = s.id
  WHERE
    (p_kind = 'missing' AND (COALESCE(c.cnt, 0) = 0 OR w.sticker_id IS NOT NULL))
    OR (p_kind = 'duplicates' AND COALESCE(c.cnt, 0) >= 2)
  ORDER BY s.group_id, s.number;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_list(INT, TEXT) TO authenticated, anon;

-- lookup_sticker_by_code passa a informar se a figurinha está na wishlist do álbum.
DROP FUNCTION IF EXISTS lookup_sticker_by_code(TEXT, INT);

CREATE FUNCTION lookup_sticker_by_code(p_code TEXT, p_album_id INT)
RETURNS TABLE (
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  owned_count INT,
  wishlisted BOOLEAN
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
    ) AS owned_count,
    EXISTS (
      SELECT 1 FROM public.album_wishlist aw
      WHERE aw.sticker_id = s.id AND aw.album_id = p_album_id
    ) AS wishlisted
  FROM public.stickers s
  WHERE s.code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_sticker_by_code(TEXT, INT) TO authenticated, anon;
