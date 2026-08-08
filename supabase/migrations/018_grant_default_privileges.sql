-- Fixes a foundational gap found by actually running every migration
-- against a live (local) Postgres instance for the first time this
-- session: `anon`, `authenticated`, and `service_role` had zero
-- SELECT/INSERT/UPDATE/DELETE grants on any table in this schema — only
-- TRUNCATE/REFERENCES/TRIGGER. Table-level GRANTs are the "can this role
-- touch this table at all" gate; Row Level Security policies (already
-- enabled on every table since 001_init.sql) are the "which rows" gate —
-- both are required, and only the second existed. Hosted Supabase projects
-- provision these grants automatically as part of the platform's own
-- project bootstrap, entirely separate from this repo's migrations; this
-- CLI-managed local instance did not reproduce that step, so this
-- migration makes the grants explicit and self-contained instead of
-- relying on undocumented platform behavior that may or may not be present
-- in every environment this project is deployed to.
--
-- `anon` gets SELECT only — no anonymous action in this app ever needs to
-- write, and RLS policies for INSERT/UPDATE that check `auth.uid()` would
-- reject an anonymous session anyway, but the base grant is scoped to match
-- intent rather than relying on RLS alone for that boundary.

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
