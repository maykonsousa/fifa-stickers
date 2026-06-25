-- Perfil público lê o álbum público do dono (p_album_id) e usa o álbum público
-- do visitante como referência (p_viewer_album_id).
DROP FUNCTION IF EXISTS get_public_stickers_album(UUID, INT, TEXT, UUID);

CREATE FUNCTION get_public_stickers_album(
  p_album_id INT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  page INT,
  "row" INT,
  "col" INT,
  orientation TEXT,
  group_id INT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_album_id IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  )
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    s.page,
    s.row,
    s.col,
    s.orientation,
    sg.id AS group_id,
    sg.name AS group_name,
    COALESCE((oc.cnt - 1), 0)::INT AS duplicate_count,
    CASE
      WHEN v_viewer_present THEN COALESCE((
        SELECT COUNT(*)::INT FROM public.user_stickers us
        WHERE us.album_id = p_viewer_album_id AND us.sticker_id = s.id
      ), 0)
      ELSE 0
    END AS viewer_owned_count
  FROM public.stickers s
  JOIN public.sticker_groups sg ON sg.id = s.group_id
  LEFT JOIN owner_counts oc ON oc.sticker_id = s.id
  WHERE s.page IS NOT NULL
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
  ORDER BY s.page, s.row, s.col;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stickers_album(INT, INT, TEXT, INT) TO anon, authenticated;

-- get_profile_view_stats por álbum. total_stickers segue sendo o tamanho do catálogo.
DROP FUNCTION IF EXISTS get_profile_view_stats(UUID, UUID);

CREATE FUNCTION get_profile_view_stats(
  p_album_id INT,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  total_stickers BIGINT,
  owner_unique_owned BIGINT,
  owner_total_duplicates BIGINT,
  trade_duplicates_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_viewer_present BOOLEAN := p_viewer_album_id IS NOT NULL AND p_viewer_album_id <> p_album_id;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.album_id = p_album_id
    GROUP BY us.sticker_id
  ),
  owner_dupes AS (
    SELECT sticker_id FROM owner_counts WHERE cnt > 1
  ),
  viewer_owned AS (
    SELECT DISTINCT us.sticker_id
    FROM public.user_stickers us
    WHERE v_viewer_present AND us.album_id = p_viewer_album_id
  )
  SELECT
    (SELECT COUNT(*) FROM public.stickers)::BIGINT AS total_stickers,
    (SELECT COUNT(*) FROM owner_counts)::BIGINT AS owner_unique_owned,
    (SELECT COUNT(*) FROM owner_dupes)::BIGINT AS owner_total_duplicates,
    CASE
      WHEN v_viewer_present THEN (
        SELECT COUNT(*)
        FROM owner_dupes od
        WHERE NOT EXISTS (
          SELECT 1 FROM viewer_owned vo WHERE vo.sticker_id = od.sticker_id
        )
      )::BIGINT
      ELSE NULL
    END AS trade_duplicates_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_view_stats(INT, INT) TO anon, authenticated;

-- get_user_share_list por álbum.
DROP FUNCTION IF EXISTS get_user_share_list(UUID, TEXT);

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
  WHERE
    (p_kind = 'missing' AND COALESCE(c.cnt, 0) = 0)
    OR (p_kind = 'duplicates' AND COALESCE(c.cnt, 0) >= 2)
  ORDER BY s.group_id, s.number;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_list(INT, TEXT) TO authenticated, anon;
