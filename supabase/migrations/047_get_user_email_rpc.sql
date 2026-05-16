-- 047_get_user_email_rpc.sql
-- Retorna o email de auth.users pra um user_id dado. Usado por server actions
-- pra montar destinatário de email transacional.

CREATE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email FROM auth.users u WHERE u.id = p_user_id;
$$;
