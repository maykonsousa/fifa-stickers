-- Drop the never-launched social graph: friends table, friend_invites table,
-- and all related RPCs. Public discovery is now handled by /colecionadores
-- via get_collector_matches (migration 049).

DROP FUNCTION IF EXISTS public.are_friends(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_friend_invite(UUID);
DROP FUNCTION IF EXISTS public.block_friend(UUID);
DROP FUNCTION IF EXISTS public.unblock_friend(UUID);
DROP FUNCTION IF EXISTS public.remove_friend(UUID);
DROP FUNCTION IF EXISTS public.get_profile_with_contact(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_trade_matches(UUID);

DROP TABLE IF EXISTS public.friend_invites CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
