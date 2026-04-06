-- Add hatch info and river section fields to parsed_reports
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS hatches JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS river_section TEXT;
