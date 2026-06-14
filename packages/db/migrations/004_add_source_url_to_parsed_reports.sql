-- Denormalize raw_reports.source_url onto parsed_reports so the original
-- report link reaches GraphQL/UI without a join. Backfill from raw_reports.
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS source_url TEXT;

UPDATE parsed_reports pr
SET source_url = rr.source_url
FROM raw_reports rr
WHERE pr.raw_report_id = rr.id
  AND pr.source_url IS DISTINCT FROM rr.source_url;
