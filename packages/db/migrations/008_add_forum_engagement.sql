-- Add forum (community) source support: per-report engagement signal and a
-- per-post discriminator so a single forum thread can yield multiple reports
-- (the original post + high-engagement replies) without overwriting each other.
--
-- Rollback runbook: docs/rollbacks/pnw-fly-fishing-source.md
--
-- Idempotent: re-running this migration is a no-op.

-- ── 1. raw_reports: source-specific metadata (forum engagement, post id, etc.) ──
-- Forum scraper writes {reactions, replies, post_type, post_id, author}; existing
-- sources leave it as the default empty object.
ALTER TABLE raw_reports
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. parsed_reports: engagement + per-post discriminator ──────────────────────
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS engagement INTEGER;
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS source_post_id TEXT;

-- ── 3. Swap the uniqueness guard to include the post discriminator ──────────────
-- Old index: (water_body_id, source_name, report_date) — one report per water/
-- source/date, which collapses multiple same-day forum posts into one row.
-- New index adds COALESCE(source_post_id, ''): shop/agency rows (source_post_id
-- NULL -> '') keep identical behavior; forum posts carry a distinct post id so
-- the original post and high-engagement replies coexist.
DROP INDEX IF EXISTS idx_parsed_reports_unique_report;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_reports_unique_report
    ON parsed_reports(water_body_id, source_name, report_date, COALESCE(source_post_id, ''));
