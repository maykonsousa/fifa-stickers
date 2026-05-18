-- Remove RPC antiga substituída por search_users (migration 051).
DROP FUNCTION IF EXISTS find_counterparty_by_email(TEXT);
