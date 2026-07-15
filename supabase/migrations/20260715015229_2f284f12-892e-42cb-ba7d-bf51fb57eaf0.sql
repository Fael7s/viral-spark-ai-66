
-- Deny-all policy so linter sees a policy; service_role bypasses RLS anyway.
CREATE POLICY "deny all" ON public.processed_webhooks FOR ALL USING (false) WITH CHECK (false);

-- Rate limit is called by server code with service_role; block direct client access.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, INT, INT) TO service_role;
