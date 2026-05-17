-- 047_public_stickers_owned_only.sql
-- Reshape get_public_stickers for the inline trade flow:
--   * `missing` tab no longer auto-narrows to viewer/owner intersection.
--     It returns the full "missing for owner" universe unless p_owned_only
--     is true (and p_viewer_id is set), in which case it filters to the
--     stickers the viewer owns (>= 1 copy).
--   * `duplicates` tab keeps the existing intersection: when p_viewer_id is
--     set and differs from p_user_id, restrict to dupes the viewer does NOT
--     own — those are the actual want candidates.

DROP FUNCTION IF EXISTS get_public_stickers;

CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_viewer_id UUID DEFAULT NULL,
  p_owned_only BOOLEAN DEFAULT FALSE
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
  v_viewer_present BOOLEAN := p_viewer_id IS NOT NULL AND p_viewer_id <> p_user_id;
  v_apply_owned_filter BOOLEAN := p_owned_only AND v_viewer_present;
BEGIN
  IF p_tab = 'missing' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_owned_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
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
      v_total AS total_count
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_owned_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
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
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
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
      v_total AS total_count
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_viewer_present OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;
