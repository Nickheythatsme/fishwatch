-- Backfill null report_date values using the raw_reports.fetched_at timestamp.
-- Reports without a date were extracted by Claude but it couldn't determine
-- the publication date from the text. The scrape date is a reasonable proxy.
UPDATE parsed_reports pr
SET report_date = rr.fetched_at::date
FROM raw_reports rr
WHERE pr.raw_report_id = rr.id
  AND pr.report_date IS NULL;
