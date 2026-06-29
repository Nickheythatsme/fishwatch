"""Entry point for the LLM extraction job.

Processes unprocessed raw reports through Claude Sonnet to extract structured
fishing condition data, one parsed_report row per water body mentioned.
"""

import json
import logging
import os
import sys
from datetime import UTC, datetime

import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from db import get_connection
from scraper.sources.odfw import ODFW_ZONES

from .parser import ExtractionParseError, parse_extraction
from .prompt import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# CSS selectors for extracting report text from HTML, per source.
# These mirror the scraper extract_content selectors.
CONTENT_SELECTORS = {
    # Oregon fly shops
    "caddis_fly": ".entry-content, article .entry-content",
    "confluence_fly_shop": ".elementor-widget-text-editor, .elementor-widget-container, article",
    "fly_fishers_place": ".entry-content, .site-content .entry-content, article .entry-content",
    "fly_and_field": ".article__content.rte, .article__content, .rte",
    "deschutes_angler": ".rte, article .blog-post, article",
    "deschutes_camp": ".progression-blog-content, .entry-content, article",
    # Washington fly shops
    "silver_bow": "main",
    # Idaho fly shops
    "fly_fish_food": "article .rte, .article__content.rte, .rte",
    "silver_creek_outfitters": ".post-content, .entry-content",
    # Community forums (each raw_report is a single forum post's page)
    "pnw_fly_fishing": ".message-body .bbWrapper, article.message",
    # ODFW zones — generated from the canonical ODFW_ZONES dict in scraper
    **{name: "#main-content, .field--name-body, .node__content" for name in ODFW_ZONES.values()},
}

# Shops that primarily cover a specific water body when ambiguous
SOURCE_DEFAULT_WATER_BODY = {
    "deschutes_angler": "Lower Deschutes River",
    "deschutes_camp": "Lower Deschutes River",
    "caddis_fly": "McKenzie River",
}

# Max characters of extracted text to send to Claude
MAX_CONTENT_LENGTH = 20000


def extract_text_from_html(html: str, source_name: str) -> str:
    """Extract the main report text from raw HTML using BS4."""
    soup = BeautifulSoup(html, "html.parser")

    # Try source-specific selectors first
    selectors = CONTENT_SELECTORS.get(source_name, "")
    for selector in selectors.split(","):
        selector = selector.strip()
        if not selector:
            continue
        el = soup.select_one(selector)
        if el:
            text = el.get_text(separator="\n", strip=True)
            if len(text) > 100:  # Only use if we got meaningful content
                return text

    # Fallback: strip common non-content elements and use body text
    for tag in soup.find_all(["nav", "header", "footer", "script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _should_fail(total_extracted: int, failures: int, reports_count: int, fatal: bool) -> bool:
    """Decide whether the extract job should exit non-zero.

    The job must exit non-zero ONLY for fatal/systemic problems so that a minority
    of per-report parse failures does not block the downstream `score` job:

    - fatal=True (e.g. DB unreachable, unexpected top-level exception) -> fail.
    - There were reports to process, yet ZERO were successfully extracted while at
      least one failed (total wipeout) -> fail.
    - Otherwise (some reports extracted, or nothing to process) -> exit 0 so `score`
      still runs on fresh data, even if a few individual reports failed to parse.
    """
    if fatal:
        return True
    if reports_count > 0 and total_extracted == 0 and failures > 0:
        return True
    return False


def run() -> int:
    conn = get_connection()
    cur = conn.cursor()

    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        # Fetch unprocessed reports
        cur.execute(
            "SELECT id, source_name, source_url, raw_html, fetched_at, metadata "
            "FROM raw_reports WHERE is_processed = FALSE"
        )
        reports = [
            {
                "id": str(row[0]),
                "source_name": row[1],
                "source_url": row[2],
                "raw_html": row[3],
                "fetched_at": row[4],
                "metadata": row[5] or {},
            }
            for row in cur.fetchall()
        ]

        if not reports:
            logger.info("No unprocessed reports found")
            return 0

        logger.info(f"Processing {len(reports)} unprocessed reports")

        # Load water body name → id mapping
        cur.execute("SELECT id, name, slug FROM water_bodies")
        name_to_id: dict[str, str] = {}
        for row in cur.fetchall():
            wb_id, name, slug = str(row[0]), row[1], row[2]
            name_to_id[name.lower()] = wb_id
            name_to_id[slug] = wb_id

        total_extracted = 0
        failures = 0

        for report in reports:
            logger.info(f"Processing {report['source_name']} ({report['id'][:8]}...)")

            # Source-specific signal carried from the scraper. For forum posts this
            # holds the reaction count (engagement) and the per-post id, which keeps
            # the original post and high-engagement replies as distinct parsed rows.
            metadata = report.get("metadata") or {}
            engagement = metadata.get("reactions")
            source_post_id = metadata.get("post_id") or None

            # Extract text from HTML
            text = extract_text_from_html(report["raw_html"], report["source_name"])

            if len(text) < 50:
                logger.warning(f"  Skipping: extracted text too short ({len(text)} chars)")
                cur.execute(
                    "UPDATE raw_reports SET is_processed = TRUE WHERE id = %s",
                    (report["id"],),
                )
                conn.commit()
                continue

            # Truncate if too long
            if len(text) > MAX_CONTENT_LENGTH:
                text = text[:MAX_CONTENT_LENGTH]

            prompt = EXTRACTION_USER_PROMPT.format(report_content=text)

            try:
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=8192,
                    system=EXTRACTION_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": prompt}],
                )
            except Exception:
                logger.exception("  Claude API error")
                failures += 1
                continue

            raw_json = response.content[0].text
            if not raw_json or not raw_json.strip():
                logger.error(
                    f"  Empty response from Claude for {report['source_name']} ({report['id'][:8]}...)"
                    f" stop_reason={response.stop_reason}, content_len={len(text)} chars"
                )
                failures += 1
                continue

            try:
                rows = parse_extraction(raw_json, report["id"], report["source_name"])
            except ExtractionParseError as e:
                logger.error(f"  Unparseable response for {report['source_name']} ({report['id'][:8]}...): {e}")
                logger.warning(f"  Response preview: {raw_json[:200]}")
                failures += 1
                continue

            if not rows:
                logger.warning(f"  No entries extracted from {report['source_name']}")

            rows_inserted = 0
            for row in rows:
                # Resolve water_body_id from name
                wb_name = row.pop("_water_body_name", None)
                water_body_id = None
                if wb_name:
                    # Try exact match
                    water_body_id = name_to_id.get(wb_name.lower())
                    # Try matching just the key part of the name
                    if not water_body_id:
                        for known_name, wid in name_to_id.items():
                            if wb_name.lower() in known_name or known_name in wb_name.lower():
                                water_body_id = wid
                                break
                # Fall back to source default
                if not water_body_id:
                    default_name = SOURCE_DEFAULT_WATER_BODY.get(report["source_name"])
                    if default_name:
                        water_body_id = name_to_id.get(default_name.lower())

                try:
                    cur.execute("SAVEPOINT extract_insert")
                    # Fall back to the scrape date if Claude couldn't extract a report date
                    fetched_at = report.get("fetched_at")
                    fallback_date = (
                        fetched_at.astimezone(UTC).date().isoformat()
                        if fetched_at
                        else datetime.now(UTC).date().isoformat()
                    )
                    report_date = row.get("report_date") or fallback_date

                    # A report can't be dated after it was scraped — clamp
                    # future dates (LLM hallucination) to the scrape date
                    if report_date > fallback_date:
                        logger.warning(f"  Future report_date {report_date} clamped to {fallback_date}")
                        report_date = fallback_date

                    # Upsert on (water_body_id, source_name, report_date,
                    # COALESCE(source_post_id, '')): re-scraped content re-extracted
                    # later replaces the older extraction instead of creating a
                    # duplicate. source_post_id (NULL for shop/agency reports, a
                    # distinct id per forum post) lets a thread's original post and
                    # high-engagement replies coexist instead of overwriting.
                    cur.execute(
                        """
                        INSERT INTO parsed_reports
                            (raw_report_id, water_body_id, source_name, source_url, report_date,
                             sentiment, species_mentioned, fly_patterns_mentioned,
                             conditions_summary, flow_commentary, water_clarity,
                             hatches, river_section, raw_extraction, engagement, source_post_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (water_body_id, source_name, report_date, COALESCE(source_post_id, ''))
                        DO UPDATE SET
                            raw_report_id = EXCLUDED.raw_report_id,
                            source_url = EXCLUDED.source_url,
                            sentiment = EXCLUDED.sentiment,
                            species_mentioned = EXCLUDED.species_mentioned,
                            fly_patterns_mentioned = EXCLUDED.fly_patterns_mentioned,
                            conditions_summary = EXCLUDED.conditions_summary,
                            flow_commentary = EXCLUDED.flow_commentary,
                            water_clarity = EXCLUDED.water_clarity,
                            hatches = EXCLUDED.hatches,
                            river_section = EXCLUDED.river_section,
                            raw_extraction = EXCLUDED.raw_extraction,
                            engagement = EXCLUDED.engagement,
                            extracted_at = NOW()
                        """,
                        (
                            row["raw_report_id"],
                            water_body_id,
                            row["source_name"],
                            report.get("source_url"),
                            report_date,
                            row.get("sentiment"),
                            row.get("species_mentioned", []),
                            row.get("fly_patterns_mentioned", []),
                            row.get("conditions_summary"),
                            row.get("flow_commentary"),
                            row.get("water_clarity"),
                            json.dumps(row.get("hatches", [])),
                            row.get("river_section"),
                            json.dumps(row.get("raw_extraction")),
                            engagement,
                            source_post_id,
                        ),
                    )
                    cur.execute("RELEASE SAVEPOINT extract_insert")
                    total_extracted += 1
                    rows_inserted += 1
                except Exception:
                    logger.exception(f"  DB insert error for water body: {wb_name}")
                    cur.execute("ROLLBACK TO SAVEPOINT extract_insert")
                    cur.execute("RELEASE SAVEPOINT extract_insert")
                    failures += 1

            # Only mark as processed if at least one row was inserted,
            # or if Claude returned no extractable entries (nothing to retry)
            if rows_inserted > 0 or not rows:
                cur.execute(
                    "UPDATE raw_reports SET is_processed = TRUE WHERE id = %s",
                    (report["id"],),
                )
            conn.commit()

            logger.info(f"  Extracted {len(rows)} entries")

        if failures > 0:
            logger.error(f"Extraction completed with {failures} failure(s) out of {len(reports)} reports.")

        logger.info(f"Extraction complete. {total_extracted} parsed reports created.")

        # Per-report failures are soft: only fail the job if NOTHING was extracted
        # despite failures (total wipeout). Otherwise exit 0 so `score` runs on the
        # fresh rows we did create.
        return 1 if _should_fail(total_extracted, failures, len(reports), fatal=False) else 0

    except Exception:
        logger.exception("Fatal error in extraction job")
        conn.rollback()
        # Systemic failure (e.g. DB unreachable) -> exit non-zero.
        return 1
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    # run() already returns the exit code (0 = success or soft per-report failures,
    # 1 = fatal/systemic failure or total extraction wipeout).
    sys.exit(run())
