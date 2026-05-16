-- Inline the admin check inside both metric RPCs.
--
-- Previously they called public.is_admin(auth.uid()), but is_admin (from
-- migration 014) is SECURITY DEFINER without SET search_path. When our
-- RPCs (which set search_path = '') call into it, the bare `admins`
-- reference inside is_admin's body fails to resolve, causing the RPC to
-- error out silently from the JS client's perspective.
--
-- Inlining the check keeps everything inside the restricted search_path
-- context with fully-qualified `public.admins`. Identical semantics to
-- is_admin, just without the cross-function call.

CREATE OR REPLACE FUNCTION get_admin_growth(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(bucket TIMESTAMPTZ, new_count INT, cumulative BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_interval INTERVAL;
  v_baseline BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_bucket NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Invalid bucket: %', p_bucket;
  END IF;

  v_end := COALESCE(p_end, now());
  v_start := COALESCE(p_start, (SELECT MIN(created_at) FROM public.profiles));

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_interval := ('1 ' || p_bucket)::INTERVAL;

  SELECT COUNT(*)::BIGINT INTO v_baseline
  FROM public.profiles
  WHERE created_at < date_trunc(p_bucket, v_start);

  RETURN QUERY
  WITH buckets AS (
    SELECT generate_series(
      date_trunc(p_bucket, v_start),
      date_trunc(p_bucket, v_end),
      v_interval
    ) AS b
  ),
  all_buckets AS (
    SELECT
      date_trunc(p_bucket, p.created_at) AS b,
      COUNT(*) AS cnt
    FROM public.profiles p
    WHERE p.created_at >= date_trunc(p_bucket, v_start)
      AND p.created_at < date_trunc(p_bucket, v_end) + v_interval
    GROUP BY 1
  ),
  joined AS (
    SELECT bk.b, COALESCE(ab.cnt, 0)::INT AS cnt
    FROM buckets bk
    LEFT JOIN all_buckets ab ON ab.b = bk.b
  )
  SELECT
    j.b AS bucket,
    j.cnt AS new_count,
    (v_baseline + SUM(j.cnt) OVER (ORDER BY j.b))::BIGINT AS cumulative
  FROM joined j
  ORDER BY j.b;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_engagement(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_bucket TEXT DEFAULT 'day'
)
RETURNS TABLE(bucket TIMESTAMPTZ, new_count INT, cumulative BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_interval INTERVAL;
  v_baseline BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_bucket NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Invalid bucket: %', p_bucket;
  END IF;

  v_end := COALESCE(p_end, now());
  v_start := COALESCE(p_start, (SELECT MIN(created_at) FROM public.user_stickers));

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_interval := ('1 ' || p_bucket)::INTERVAL;

  SELECT COUNT(*)::BIGINT INTO v_baseline
  FROM public.user_stickers
  WHERE created_at < date_trunc(p_bucket, v_start);

  RETURN QUERY
  WITH buckets AS (
    SELECT generate_series(
      date_trunc(p_bucket, v_start),
      date_trunc(p_bucket, v_end),
      v_interval
    ) AS b
  ),
  all_buckets AS (
    SELECT
      date_trunc(p_bucket, us.created_at) AS b,
      COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.created_at >= date_trunc(p_bucket, v_start)
      AND us.created_at < date_trunc(p_bucket, v_end) + v_interval
    GROUP BY 1
  ),
  joined AS (
    SELECT bk.b, COALESCE(ab.cnt, 0)::INT AS cnt
    FROM buckets bk
    LEFT JOIN all_buckets ab ON ab.b = bk.b
  )
  SELECT
    j.b AS bucket,
    j.cnt AS new_count,
    (v_baseline + SUM(j.cnt) OVER (ORDER BY j.b))::BIGINT AS cumulative
  FROM joined j
  ORDER BY j.b;
END;
$$;
