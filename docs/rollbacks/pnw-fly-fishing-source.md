# Rollback runbook — PNW Fly Fishing forum source

Covers the change that added the `pnw_fly_fishing` community-forum source: the
`008_add_forum_engagement.sql` migration plus the scraper/extractor/scorer code.
Use this to revert cleanly if forum content distorts signals or the migration
misbehaves in production.

## When to roll back (trigger conditions)

- Composite `water_scores` look distorted after forum reports land (e.g. a water
  body's sentiment swings on low-quality forum chatter). **Check first:**
  `SELECT source_name, sentiment, engagement, report_date FROM parsed_reports
   WHERE source_name='pnw_fly_fishing' ORDER BY report_date DESC LIMIT 50;`
- Extractor errors on the unique index (`idx_parsed_reports_unique_report`) —
  indicates the index swap didn't apply or `source_post_id` isn't populated.
- The scrape job fails on `pnw_fly_fishing` (forum layout/WAF change). A scraper
  failure is isolated (other sources keep running), so this rarely needs a DB
  rollback — usually just disable the source (see "Code rollback").

## Safety summary

The column adds (`raw_reports.metadata`, `parsed_reports.engagement`,
`parsed_reports.source_post_id`) are **additive and nullable/defaulted** — safe to
leave in place. The **only destructive step is the unique-index swap**. If you only
need to stop forum data, prefer disabling the source in code + purging forum rows
and skip the schema rollback entirely.

## 1. Code rollback

Revert the PR/commit that introduced the source, or minimally disable it by
removing `PNWFlyFishingScraper()` from `SCRAPERS` in `jobs/scraper/main.py`. The
other changes are inert without forum data:
- `jobs/scraper/sources/pnw_fly_fishing.py` (new scraper)
- `jobs/scraper/sources/base.py` (`extract_records`) — backward compatible; existing
  scrapers still emit one record each.
- `jobs/scraper/main.py` (metadata insert), `jobs/extractor/main.py`
  (engagement/source_post_id), `jobs/scorer/sentiment_score.py` +
  `jobs/scorer/fly_ranking.py` (weighting).

Reverting code is safe whether or not the schema is rolled back: the scorer reads
`SOURCE_WEIGHTS` and `engagement` defensively (missing source → weight 1.0,
`engagement` None → factor 1.0).

## 2. Data cleanup (purge forum rows)

`parsed_reports.raw_report_id` cascades on delete, but run both for clarity, then
recompute affected scores:

```sql
DELETE FROM parsed_reports WHERE source_name = 'pnw_fly_fishing';
DELETE FROM raw_reports    WHERE source_name = 'pnw_fly_fishing';
```

Then re-run the scorer so `water_scores` no longer reflect forum input:

```bash
cd jobs && python -m scorer.main
```

## 3. Schema rollback (only if reverting the migration)

Apply in this exact order — **drop the new index, restore the original index,
then drop the columns** (dropping a column used by the index first would error):

```sql
-- 3a. Restore the original 3-column unique guard.
DROP INDEX IF EXISTS idx_parsed_reports_unique_report;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_reports_unique_report
    ON parsed_reports(water_body_id, source_name, report_date);

-- 3b. Drop the added columns (additive — only needed for a full revert).
ALTER TABLE parsed_reports DROP COLUMN IF EXISTS source_post_id;
ALTER TABLE parsed_reports DROP COLUMN IF EXISTS engagement;
ALTER TABLE raw_reports    DROP COLUMN IF EXISTS metadata;
```

> ⚠️ Before restoring the 3-column index, ensure no duplicate
> `(water_body_id, source_name, report_date)` rows remain — forum OP+reply rows
> share those three values and only differ by `source_post_id`. Step 2 (purging
> forum rows) removes them. If you skip the purge, the `CREATE UNIQUE INDEX` in
> 3a will fail on duplicates.

**Pre-migration index definition (restore target), verbatim from `003_dedupe_parsed_reports.sql`:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_reports_unique_report
    ON parsed_reports(water_body_id, source_name, report_date);
```

## 4. Verify the DB matches the pre-migration shape

```sql
-- Columns should be gone:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'parsed_reports' AND column_name IN ('engagement', 'source_post_id');   -- expect 0 rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'raw_reports' AND column_name = 'metadata';                              -- expect 0 rows

-- Index should be back to the 3 original columns (no source_post_id expression):
SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_parsed_reports_unique_report';
-- expect: ... (water_body_id, source_name, report_date)
```

## Notes

- `packages/db/schema.sql` and `packages/db/types.ts` describe the post-migration
  shape; revert them alongside the migration if you fully roll back.
- Validate this runbook on a staging/branch DB before production: apply
  `008_add_forum_engagement.sql`, then apply sections 3a–3b, and confirm section 4
  shows the pre-migration shape.
