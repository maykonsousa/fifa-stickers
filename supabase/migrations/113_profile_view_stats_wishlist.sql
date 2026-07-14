-- get_profile_view_stats passa a expor wishlist_needed: figurinhas da lista de
-- desejos do dono que ele JÁ possui (owned >= 1). Faltantes que também estão na
-- wishlist já contam em owner_unique_owned como faltantes, então contamos só o
-- incremento para evitar dupla contagem no gate de "Preciso".
DROP FUNCTION IF EXISTS get_profile_view_stats(INT, INT);

CREATE FUNCTION get_profile_view_stats(
  p_album_id INT,
  p_viewer_album_id INT DEFAULT NULL
)
RETURNS TABLE(
  total_stickers BIGINT,
  owner_unique_owned BIGINT,
  owner_total_duplicates BIGINT,
  trade_duplicates_count BIGINT,
  wishlist_needed BIGINT
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
  owner_wishlist_owned AS (
    SELECT aw.sticker_id
    FROM public.album_wishlist aw
    JOIN owner_counts oc ON oc.sticker_id = aw.sticker_id
    WHERE aw.album_id = p_album_id AND oc.cnt >= 1
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
    END AS trade_duplicates_count,
    (SELECT COUNT(*) FROM owner_wishlist_owned)::BIGINT AS wishlist_needed;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_view_stats(INT, INT) TO anon, authenticated;
