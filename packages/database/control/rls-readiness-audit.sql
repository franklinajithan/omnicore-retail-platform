-- Read-only RLS readiness audit. Run against the retail database.
-- All public application tables are listed, including child tables.
-- This report MUST show no unprotected tenant data tables before enabling
-- shared-database multi-tenancy. Review global lookup tables individually.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = c.oid AND a.attname = 'tenantId'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) AS has_tenant_id,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname = 'public'
  AND c.relname NOT LIKE '_prisma_%'
ORDER BY
  c.relrowsecurity ASC,
  c.relforcerowsecurity ASC,
  c.relname ASC;

-- Verify runtime credentials are not superusers and cannot bypass RLS.
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;
