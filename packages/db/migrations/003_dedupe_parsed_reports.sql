-- Clean up parsed_reports data quality issues and prevent recurrence:
--
-- 1. Future-dated reports: the LLM extractor occasionally hallucinates a
--    report_date after the date the content was scraped. Clamp those to the
--    scrape date.
-- 2. Duplicate reports: the same report re-scraped (with a changed content
--    hash) gets re-extracted as a new parsed_reports row. Keep only the most
--    recent extraction per (water_body_id, source_name, report_date) and add
--    a unique index so the extractor can upsert instead of insert.

-- ── 1. Fix future-dated reports ─────────────────────────────────────────────
UPDATE parsed_reports pr
SET report_date = (rr.fetched_at AT TIME ZONE 'UTC')::date
FROM raw_reports rr
WHERE pr.raw_report_id = rr.id
  AND pr.report_date > (rr.fetched_at AT TIME ZONE 'UTC')::date;

-- ── 2. Remove duplicates, keeping the most recent extraction ────────────────
DELETE FROM parsed_reports pr
USING parsed_reports newer
WHERE pr.id <> newer.id
  AND pr.water_body_id = newer.water_body_id
  AND pr.source_name = newer.source_name
  AND pr.report_date = newer.report_date
  AND (pr.extracted_at < newer.extracted_at
       OR (pr.extracted_at = newer.extracted_at AND pr.id < newer.id));

-- ── 3. Prevent future duplicates ─────────────────────────────────────────────
-- One report per (water body, source, date). Rows with NULL water_body_id
-- (reports that didn't match a known water body) are exempt since NULLs are
-- distinct in unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_reports_unique_report
    ON parsed_reports(water_body_id, source_name, report_date);
