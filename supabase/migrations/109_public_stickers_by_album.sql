-- get_public_stickers (lista do perfil público) passa a contar dentro do álbum.
DROP FUNCTION IF EXISTS get_public_stickers(UUID, TEXT, INT, TEXT, INT, INT, UUID, TEXT);

CREATE FUNCTION get_public_stickers(
  p_album_id INT,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_viewer_album_id INT DEFAULT NULL,
  p_viewer_filter TEXT DEFAULT 'all'
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total BIGINT;
  v_viewer_present BOOLEAN := p_viewer_album_id IS NOT NULL AND p_viewer_album_id <> p_album_id;
  v_apply_owned BOOLEAN := v_viewer_present AND p_viewer_filter = 'owned';
  v_apply_dupes BOOLEAN := v_viewer_present AND p_viewer_filter = 'duplicates';
BEGIN
  IF p_tab = 'missing' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_album_id
    )
    AND (NOT v_apply_owned OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_viewer_album_id
    ))
    AND (NOT v_apply_dupes OR s.id IN (
      SELECT us.sticker_id
      FROM public.user_stickers us
      WHERE us.album_id = p_viewer_album_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      0 AS duplicate_count,
      CASE
        WHEN v_viewer_present THEN COALESCE((
          SELECT COUNT(*)::INT FROM public.user_stickers us
          WHERE us.album_id = p_viewer_album_id AND us.sticker_id = s.id
        ), 0)
        ELSE 0
      END AS viewer_owned_count,
      v_total AS total_count
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_album_id
    )
    AND (NOT v_apply_owned OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_viewer_album_id
    ))
    AND (NOT v_apply_dupes OR s.id IN (
      SELECT us.sticker_id
      FROM public.user_stickers us
      WHERE us.album_id = p_viewer_album_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;

  ELSIF p_tab = 'duplicates' THEN
    SELECT COUNT(*) INTO v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.album_id = p_album_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_viewer_album_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      (dupes.cnt - 1)::INT AS duplicate_count,
      0 AS viewer_owned_count,
      v_total AS total_count
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.album_id = p_album_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.album_id = p_viewer_album_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stickers(INT, TEXT, INT, TEXT, INT, INT, INT, TEXT) TO anon, authenticated;
