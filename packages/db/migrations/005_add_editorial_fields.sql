-- Add first-hand editorial fields to water_bodies (E-E-A-T): a human byline and
-- genuine local notes. Both nullable — only populated waters render the section.
ALTER TABLE water_bodies ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE water_bodies ADD COLUMN IF NOT EXISTS editorial_notes TEXT;
