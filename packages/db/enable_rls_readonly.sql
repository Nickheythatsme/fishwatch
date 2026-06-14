-- Lock the public API surface down to READ-ONLY.
--
-- Score.Fish is a public, read-only app: anyone may read every table, but the
-- only writer is the Python pipeline, which connects via the privileged
-- DATABASE_URL (table owner) and therefore bypasses RLS. The browser-facing
-- anon / authenticated roles (publishable key) must NOT be able to write.
--
-- This file supersedes the now-deleted disable_rls.sql, which left RLS off AND
-- granted INSERT/UPDATE/DELETE to anon — meaning anyone with the public key
-- could modify or delete every row via the auto-generated PostgREST API.
--
-- Run this in the Supabase SQL Editor (or via `supabase apply_migration`).

-- 1. Strip ALL privileges from the public-facing roles, then re-grant only what
--    they need below. This also clears leftover TRUNCATE/TRIGGER/REFERENCES from
--    any prior `GRANT ALL`, leaving anon/authenticated with SELECT only.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 2. Keep read access so PostgREST/GraphQL can serve public data.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Enable Row Level Security on every public table.
ALTER TABLE water_bodies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE species        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fly_patterns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE gauge_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_scores   ENABLE ROW LEVEL SECURITY;

-- 4. Public read-only policies. SELECT-only + no write policies means the anon
--    and authenticated roles can read but never INSERT/UPDATE/DELETE.
--    The pipeline's owner connection bypasses RLS, so writes are unaffected.
--    Postgres has no CREATE POLICY IF NOT EXISTS, so DROP-then-CREATE keeps this
--    script idempotent for disaster-recovery re-runs.
DROP POLICY IF EXISTS "public read" ON water_bodies;
CREATE POLICY "public read" ON water_bodies   FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON species;
CREATE POLICY "public read" ON species        FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON fly_patterns;
CREATE POLICY "public read" ON fly_patterns   FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON raw_reports;
CREATE POLICY "public read" ON raw_reports    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON parsed_reports;
CREATE POLICY "public read" ON parsed_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON gauge_readings;
CREATE POLICY "public read" ON gauge_readings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read" ON water_scores;
CREATE POLICY "public read" ON water_scores   FOR SELECT TO anon, authenticated USING (true);
