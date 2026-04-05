-- Add hatch info and river section fields to parsed_reports
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS hatches JSONB DEFAULT '[]';
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS river_section TEXT;

-- Reset is_processed so existing reports get re-extracted
UPDATE raw_reports SET is_processed = FALSE;
