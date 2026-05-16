-- Time-bucketed metrics for the admin dashboard. Both functions share
-- the same structure; the only difference is which table they aggregate.
-- p_start = NULL means "since the first record"; used by the "Tudo" preset.
-- The cumulative column is a true running total from the dawn of the
-- table, not just within the requested window (v_baseline holds the count
-- of rows that fell before v_start, computed once into a plpgsql variable).

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
  IF NOT public.is_admin(auth.uid()) THEN
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
  IF NOT public.is_admin(auth.uid()) THEN
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

REVOKE ALL ON FUNCTION get_admin_growth(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_admin_engagement(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_growth(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_engagement(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
