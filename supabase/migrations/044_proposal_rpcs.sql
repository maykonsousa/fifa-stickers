-- 044_proposal_rpcs.sql
-- Funções SECURITY DEFINER para todas as escritas em proposals/_items/_messages.
-- RLS bloqueia mutations diretas no client.

CREATE FUNCTION create_proposal(
  p_owner_user_id UUID,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_proposer_id UUID := auth.uid();
  v_proposal_id UUID;
  v_item JSONB;
  v_want_count INT;
  v_offer_count INT;
BEGIN
  IF v_proposer_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF v_proposer_id = p_owner_user_id THEN
    RAISE EXCEPTION 'cannot propose to yourself';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_owner_user_id) THEN
    RAISE EXCEPTION 'owner not found';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'direction' = 'want'),
    COUNT(*) FILTER (WHERE item->>'direction' = 'offer')
  INTO v_want_count, v_offer_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_want_count = 0 OR v_offer_count = 0 THEN
    RAISE EXCEPTION 'proposal must have at least one want and one offer item';
  END IF;

  INSERT INTO proposals (proposer_user_id, owner_user_id)
  VALUES (v_proposer_id, p_owner_user_id)
  RETURNING id INTO v_proposal_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO proposal_items (proposal_id, sticker_id, direction, quantity)
    VALUES (
      v_proposal_id,
      (v_item->>'sticker_id')::INT,
      v_item->>'direction',
      (v_item->>'quantity')::INT
    );
  END LOOP;

  RETURN v_proposal_id;
END;
$$;

CREATE FUNCTION decide_proposal(p_proposal_id UUID, p_accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT owner_user_id, status INTO v_owner, v_status FROM proposals WHERE id = p_proposal_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_owner <> v_caller THEN RAISE EXCEPTION 'only owner can decide'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'proposal is not pending'; END IF;

  UPDATE proposals
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      decided_at = now(),
      last_activity_at = now(),
      owner_seen_at = now()
  WHERE id = p_proposal_id;
END;
$$;

CREATE FUNCTION cancel_proposal(p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_proposer UUID;
  v_status TEXT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT proposer_user_id, status INTO v_proposer, v_status FROM proposals WHERE id = p_proposal_id;
  IF v_proposer IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_proposer <> v_caller THEN RAISE EXCEPTION 'only proposer can cancel'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'only pending can be cancelled'; END IF;

  UPDATE proposals
  SET status = 'cancelled',
      decided_at = now(),
      last_activity_at = now(),
      proposer_seen_at = now()
  WHERE id = p_proposal_id;
END;
$$;

CREATE FUNCTION post_proposal_message(p_proposal_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_message_id UUID;
  v_owner UUID;
  v_proposer UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer FROM proposals WHERE id = p_proposal_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'proposal not found'; END IF;
  IF v_caller <> v_owner AND v_caller <> v_proposer THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  INSERT INTO proposal_messages (proposal_id, sender_user_id, body)
  VALUES (p_proposal_id, v_caller, p_body)
  RETURNING id INTO v_message_id;

  UPDATE proposals
  SET last_activity_at = now(),
      proposer_seen_at = CASE WHEN v_caller = v_proposer THEN now() ELSE proposer_seen_at END,
      owner_seen_at    = CASE WHEN v_caller = v_owner    THEN now() ELSE owner_seen_at END
  WHERE id = p_proposal_id;

  RETURN v_message_id;
END;
$$;

CREATE FUNCTION mark_proposal_seen(p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
  v_proposer UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT owner_user_id, proposer_user_id INTO v_owner, v_proposer FROM proposals WHERE id = p_proposal_id;
  IF v_caller = v_owner THEN
    UPDATE proposals SET owner_seen_at = now() WHERE id = p_proposal_id;
  ELSIF v_caller = v_proposer THEN
    UPDATE proposals SET proposer_seen_at = now() WHERE id = p_proposal_id;
  ELSE
    RAISE EXCEPTION 'not a participant';
  END IF;
END;
$$;

CREATE FUNCTION count_unseen_proposals()
RETURNS INT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM proposals
  WHERE
    (owner_user_id = auth.uid()
       AND (owner_seen_at IS NULL OR owner_seen_at < last_activity_at))
    OR
    (proposer_user_id = auth.uid()
       AND proposer_seen_at < last_activity_at);
$$;
