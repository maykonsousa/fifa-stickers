-- Helpers de manipulação de user_stickers
CREATE OR REPLACE FUNCTION add_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stickers (user_id, sticker_id)
  SELECT p_user_id, p_sticker_id
  FROM generate_series(1, p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION remove_user_stickers(p_user_id UUID, p_sticker_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM user_stickers
  WHERE id IN (
    SELECT id FROM user_stickers
    WHERE user_id = p_user_id AND sticker_id = p_sticker_id
    LIMIT p_quantity
  );
END;
$$;

-- Busca de usuário por email (membro existente)
CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT, email TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- find_or_create_lead (idempotente)
CREATE OR REPLACE FUNCTION find_or_create_lead(
  p_email TEXT,
  p_name TEXT,
  p_city TEXT,
  p_state TEXT,
  p_whatsapp TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_normalized_email TEXT := lower(trim(p_email));
BEGIN
  SELECT id INTO v_lead_id FROM leads WHERE email = v_normalized_email;
  IF v_lead_id IS NOT NULL THEN
    RETURN v_lead_id;
  END IF;

  INSERT INTO leads (email, name, city, state, whatsapp, invited_by_user_id)
  VALUES (v_normalized_email, p_name, p_city, p_state, p_whatsapp, auth.uid())
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- mark_all_trades_as_seen — chamado quando counterparty membro abre /trades
CREATE OR REPLACE FUNCTION mark_all_trades_as_seen()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE trades
  SET counterparty_seen_at = now()
  WHERE counterparty_user_id = auth.uid()
    AND counterparty_seen_at IS NULL;
END;
$$;

-- create_trade — RPC principal, atômico
CREATE OR REPLACE FUNCTION create_trade(
  p_counterparty_user_id UUID,
  p_counterparty_lead_id UUID,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_initiator_id UUID := auth.uid();
  v_trade_id UUID;
  v_item JSONB;
  v_given_count INT;
  v_received_count INT;
BEGIN
  IF v_initiator_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF (p_counterparty_user_id IS NULL) = (p_counterparty_lead_id IS NULL) THEN
    RAISE EXCEPTION 'must provide exactly one of counterparty_user_id or counterparty_lead_id';
  END IF;

  IF p_counterparty_user_id = v_initiator_id THEN
    RAISE EXCEPTION 'cannot trade with yourself';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'direction' = 'given'),
    COUNT(*) FILTER (WHERE item->>'direction' = 'received')
  INTO v_given_count, v_received_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_given_count = 0 OR v_received_count = 0 THEN
    RAISE EXCEPTION 'trade must have at least one given and one received item';
  END IF;

  INSERT INTO trades (initiator_user_id, counterparty_user_id, counterparty_lead_id)
  VALUES (v_initiator_id, p_counterparty_user_id, p_counterparty_lead_id)
  RETURNING id INTO v_trade_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO trade_items (trade_id, sticker_id, direction, quantity)
    VALUES (
      v_trade_id,
      (v_item->>'sticker_id')::INT,
      v_item->>'direction',
      (v_item->>'quantity')::INT
    );

    IF v_item->>'direction' = 'given' THEN
      PERFORM remove_user_stickers(v_initiator_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      IF p_counterparty_user_id IS NOT NULL THEN
        PERFORM add_user_stickers(p_counterparty_user_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      END IF;
    ELSE
      PERFORM add_user_stickers(v_initiator_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      IF p_counterparty_user_id IS NOT NULL THEN
        PERFORM remove_user_stickers(p_counterparty_user_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      END IF;
    END IF;
  END LOOP;

  RETURN v_trade_id;
END;
$$;
