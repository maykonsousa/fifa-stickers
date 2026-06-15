-- fix_count_unseen_proposals_pending_only
-- Only count proposals with status = 'pending' for the badge

CREATE OR REPLACE FUNCTION count_unseen_proposals()
RETURNS INT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM proposals
  WHERE status = 'pending'
    AND (
      (owner_user_id = auth.uid()
         AND (owner_seen_at IS NULL OR owner_seen_at < last_activity_at))
      OR
      (proposer_user_id = auth.uid()
         AND proposer_seen_at < last_activity_at)
    );
$$;
