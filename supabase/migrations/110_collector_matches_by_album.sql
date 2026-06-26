-- get_collector_matches escopado por álbum público (multi-álbum).
-- A coleção visível/negociável de cada usuário é o seu public_album_id;
-- viewer_missing e candidate_duplicates passam a contar dentro do álbum público.
-- Assinatura inalterada — callers não mudam.
CREATE OR REPLACE FUNCTION public.get_collector_matches(
  p_viewer_id UUID,
  p_group_id INT DEFAULT NULL,
  p_only_nearby BOOLEAN DEFAULT FALSE,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  match_count INT,
  preview_sticker_ids INT[],
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_viewer_city TEXT;
  v_viewer_state TEXT;
  v_viewer_album_id INT;
BEGIN
  SELECT p.city, p.state, p.public_album_id
  INTO v_viewer_city, v_viewer_state, v_viewer_album_id
  FROM public.profiles p
  WHERE p.id = p_viewer_id;

  RETURN QUERY
  WITH viewer_missing AS (
    SELECT s.id AS sticker_id
    FROM public.stickers s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_stickers us
      WHERE us.album_id = v_viewer_album_id AND us.sticker_id = s.id
    )
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
  ),
  candidate_duplicates AS (
    -- Duplicatas no álbum público de cada candidato.
    SELECT cp.id AS user_id, us.sticker_id
    FROM public.user_stickers us
    JOIN public.profiles cp ON cp.public_album_id = us.album_id
    JOIN viewer_missing vm ON vm.sticker_id = us.sticker_id
    WHERE cp.id <> p_viewer_id
    GROUP BY cp.id, us.sticker_id HAVING COUNT(*) > 1
  ),
  aggregated AS (
    SELECT
      cd.user_id,
      COUNT(*)::INT AS match_count,
      (ARRAY_AGG(cd.sticker_id ORDER BY cd.sticker_id))[1:4] AS preview_sticker_ids
    FROM candidate_duplicates cd
    GROUP BY cd.user_id
  ),
  filtered AS (
    SELECT
      p.id AS user_id,
      p.username::TEXT AS username,
      p.display_name,
      p.avatar_url,
      p.city,
      p.state,
      a.match_count,
      a.preview_sticker_ids,
      CASE
        WHEN p.city = v_viewer_city AND p.state = v_viewer_state THEN 2
        WHEN p.state = v_viewer_state THEN 1
        ELSE 0
      END AS proximity_score,
      (SELECT MAX(us.created_at) FROM public.user_stickers us WHERE us.album_id = p.public_album_id) AS last_activity
    FROM aggregated a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE (NOT p_only_nearby OR p.state = v_viewer_state)
  )
  SELECT
    f.user_id,
    f.username,
    f.display_name,
    f.avatar_url,
    f.city,
    f.state,
    f.match_count,
    f.preview_sticker_ids,
    COUNT(*) OVER () AS total_count
  FROM filtered f
  ORDER BY
    f.match_count DESC,
    f.proximity_score DESC,
    f.last_activity DESC NULLS LAST
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_collector_matches(UUID, INT, BOOLEAN, INT, INT) TO authenticated;
