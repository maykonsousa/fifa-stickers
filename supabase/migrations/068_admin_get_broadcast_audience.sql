-- 068_admin_get_broadcast_audience.sql
-- Retorna (user_id, email, display_name) de todos os profiles cujo auth.users.email
-- está preenchido. SECURITY DEFINER porque precisa ler auth.users; restringido a admins.

CREATE OR REPLACE FUNCTION admin_get_broadcast_audience()
RETURNS TABLE (user_id UUID, email TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.display_name
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL AND u.email <> '';
END;
$$;

REVOKE ALL ON FUNCTION admin_get_broadcast_audience() FROM public;
GRANT EXECUTE ON FUNCTION admin_get_broadcast_audience() TO authenticated;
