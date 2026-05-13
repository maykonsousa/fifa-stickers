DROP FUNCTION IF EXISTS get_public_stickers;

CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  group_name TEXT,
  duplicate_count INT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total BIGINT;
BEGIN
  IF p_tab = 'missing' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
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
      v_total AS total_count
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;

  ELSIF p_tab = 'duplicates' THEN
    SELECT COUNT(*) INTO v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT
      s.id,
      s.code,
      s.title,
      s.image_url,
      sg.name AS group_name,
      (dupes.cnt - 1)::INT AS duplicate_count,
      v_total AS total_count
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id
      HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;
