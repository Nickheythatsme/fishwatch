-- Unify region values to state-level identifiers.
-- Existing rows use 'central-oregon'; new rows use 'oregon', 'washington', 'idaho'.
-- This migration normalizes all Oregon water bodies to 'oregon' and updates the default.

UPDATE water_bodies SET region = 'oregon' WHERE region = 'central-oregon';

ALTER TABLE water_bodies ALTER COLUMN region SET DEFAULT 'oregon';
