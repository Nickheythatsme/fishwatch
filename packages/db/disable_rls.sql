-- Disable Row Level Security on all tables so the publishable key can access them.
-- Run this in the Supabase SQL Editor.

ALTER TABLE water_bodies DISABLE ROW LEVEL SECURITY;
ALTER TABLE species DISABLE ROW LEVEL SECURITY;
ALTER TABLE fly_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE gauge_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE water_scores DISABLE ROW LEVEL SECURITY;

-- Also grant usage and select to the anon and authenticated roles
-- so PostgREST can see the tables in the schema cache.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
