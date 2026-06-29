"""Refresh forum engagement (reaction counts) on previously-scraped posts.

Forum reaction counts are captured once, at first scrape, and then frozen (raw_reports
dedups on content_hash, and the extractor processes each raw_report once). Reactions
keep accruing, so this job periodically re-visits the forum threads that still fall
inside the scorer's lookback window and:

  - updates the stored reaction count on existing posts (raw_reports.metadata +
    parsed_reports.engagement) when it has changed, and
  - ingests replies that have newly crossed the engagement threshold since first scrape
    (inserted as fresh raw_reports for the extractor to pick up).

Re-scoring happens in the downstream `score` job; this job only refreshes the inputs.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import sys
from datetime import UTC, datetime

from playwright.async_api import async_playwright
from psycopg2.extras import Json

from db import get_connection

from .sources.pnw_fly_fishing import PNWFlyFishingScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

FORUM_SOURCE = "pnw_fly_fishing"

# Only refresh posts the scorer still considers. Mirrors scorer REPORT_LOOKBACK_DAYS;
# kept local so the refresh job doesn't import the scorer package.
REFRESH_LOOKBACK_DAYS = 21

# A per-post permalink looks like ".../threads/slug.id/post-NNN"; strip the anchor to
# get the thread URL the browser should load.
_POST_ANCHOR_RE = re.compile(r"/post-\d+/?$")


def thread_url_from_source_url(source_url: str) -> str:
    """Derive a thread URL from a per-post source_url by dropping the /post-NNN anchor."""
    return _POST_ANCHOR_RE.sub("", source_url)


def classify_posts(known: dict[str, int], records: list[dict]) -> tuple[list[dict], list[dict]]:
    """Split freshly-read thread records into engagement updates and new inserts.

    ``known`` maps post_id -> the reaction count we currently have stored.

    - A record whose post_id is known and whose reaction count changed -> update.
    - A record whose post_id we've never stored (a reply that has newly crossed the
      engagement threshold) -> insert.
    - A known post with an unchanged count -> neither (no-op).

    Records without a post_id (e.g. the body-fallback record) are ignored.
    """
    updates: list[dict] = []
    inserts: list[dict] = []
    for record in records:
        meta = record.get("metadata") or {}
        post_id = meta.get("post_id")
        if not post_id:
            continue
        reactions = int(meta.get("reactions") or 0)
        if post_id in known:
            if known[post_id] != reactions:
                updates.append(record)
        else:
            inserts.append(record)
    return updates, inserts


def _load_known_reactions(cur) -> dict[str, int]:
    """Map post_id -> stored reaction count for every forum raw_report."""
    cur.execute(
        """
        SELECT metadata->>'post_id', (metadata->>'reactions')::int
        FROM raw_reports
        WHERE source_name = %s AND metadata ? 'post_id'
        """,
        (FORUM_SOURCE,),
    )
    return {row[0]: row[1] for row in cur.fetchall() if row[0] is not None}


def _load_thread_urls(cur) -> list[str]:
    """Distinct thread URLs for forum posts still inside the lookback window."""
    cur.execute(
        """
        SELECT DISTINCT source_url
        FROM parsed_reports
        WHERE source_name = %s
          AND source_url IS NOT NULL
          AND report_date >= CURRENT_DATE - %s
        """,
        (FORUM_SOURCE, REFRESH_LOOKBACK_DAYS),
    )
    urls = {thread_url_from_source_url(row[0]) for row in cur.fetchall() if row[0]}
    return sorted(urls)


def _apply_update(cur, record: dict, now_iso: str) -> None:
    """Refresh the stored reaction count on raw_reports + parsed_reports for one post."""
    meta = record["metadata"]
    post_id = meta["post_id"]
    reactions = int(meta.get("reactions") or 0)
    # Merge the new count + a refresh timestamp into the existing metadata.
    cur.execute(
        """
        UPDATE raw_reports
        SET metadata = metadata || %(patch)s
        WHERE source_name = %(source)s AND metadata->>'post_id' = %(post_id)s
        """,
        {
            "patch": Json({"reactions": reactions, "engagement_refreshed_at": now_iso}),
            "source": FORUM_SOURCE,
            "post_id": post_id,
        },
    )
    cur.execute(
        """
        UPDATE parsed_reports
        SET engagement = %s
        WHERE source_name = %s AND source_post_id = %s
        """,
        (reactions, FORUM_SOURCE, post_id),
    )


def _insert_new_report(cur, record: dict, now_iso: str) -> bool:
    """Insert a newly-qualifying reply as an unprocessed raw_report. Returns True if inserted."""
    content = record.get("content") or ""
    content_hash = hashlib.sha256(content.encode()).hexdigest()
    cur.execute(
        """
        INSERT INTO raw_reports
            (source_name, source_url, raw_html, content_hash, fetched_at, metadata)
        VALUES (%(source_name)s, %(source_url)s, %(raw_html)s, %(content_hash)s, %(fetched_at)s, %(metadata)s)
        ON CONFLICT (source_name, content_hash) DO NOTHING
        RETURNING id
        """,
        {
            "source_name": FORUM_SOURCE,
            "source_url": record.get("source_url"),
            "raw_html": record.get("raw_html") or content,
            "content_hash": content_hash,
            "fetched_at": now_iso,
            "metadata": Json(record.get("metadata") or {}),
        },
    )
    return cur.fetchone() is not None


async def main() -> int:
    conn = get_connection()
    cur = conn.cursor()
    failures = 0
    updated = 0
    inserted = 0

    try:
        known = _load_known_reactions(cur)
        thread_urls = _load_thread_urls(cur)
        logger.info(f"Refreshing engagement for {len(thread_urls)} in-window forum thread(s)")

        if not thread_urls:
            logger.info("No in-window forum threads to refresh")
            return 0

        scraper = PNWFlyFishingScraper()

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Score.Fish/1.0 (fishing report aggregator)")
            context.set_default_timeout(scraper.goto_timeout_ms)
            try:
                page = await context.new_page()
                for thread_url in thread_urls:
                    try:
                        cur.execute("SAVEPOINT refresh_thread")
                        await page.goto(thread_url, wait_until=scraper.goto_wait_until)
                        records = await scraper.extract_records(page, thread_url)
                        update_recs, insert_recs = classify_posts(known, records)

                        now_iso = datetime.now(UTC).isoformat()
                        for record in update_recs:
                            _apply_update(cur, record, now_iso)
                            updated += 1
                        for record in insert_recs:
                            if _insert_new_report(cur, record, now_iso):
                                inserted += 1
                                # Avoid re-inserting if the same post recurs this run.
                                known[record["metadata"]["post_id"]] = int(record["metadata"].get("reactions") or 0)

                        cur.execute("RELEASE SAVEPOINT refresh_thread")
                    except Exception:
                        logger.exception(f"Failed to refresh thread {thread_url}")
                        cur.execute("ROLLBACK TO SAVEPOINT refresh_thread")
                        cur.execute("RELEASE SAVEPOINT refresh_thread")
                        failures += 1
                        continue
            finally:
                await browser.close()

        conn.commit()
        logger.info(
            f"Engagement refresh complete. {updated} updated, "
            f"{inserted} new replies ingested, {failures} thread failure(s)."
        )
        return failures
    except Exception:
        logger.exception("Fatal error in engagement refresh job")
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()


def run() -> int:
    return asyncio.run(main())


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
