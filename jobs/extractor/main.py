"""Entry point for the LLM extraction job.

Processes unprocessed raw reports through Claude Sonnet to extract structured
fishing condition data, one parsed_report row per water body mentioned.
"""

import json
import logging
import os
import sys

import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from db import get_connection

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
    "confluence_fly_shop": ".progression-blog-content, .entry-content, article",
    "fly_fishers_place": ".entry-content, .site-content .entry-content, article .entry-content",
    "fly_and_field": ".article__content.rte, .article__content, .rte",
    "deschutes_angler": ".rte, article .blog-post, article",
    "deschutes_camp": ".progression-blog-content, .entry-content, article",
    "odfw_central_zone": "#main-content, .field--name-body, .node__content",
}

# Shops that primarily cover a specific water body when ambiguous
SOURCE_DEFAULT_WATER_BODY = {
    "deschutes_angler": "Lower Deschutes River",
    "deschutes_camp": "Lower Deschutes River",
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


def run() -> int:
    conn = get_connection()
    cur = conn.cursor()

    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        # Fetch unprocessed reports
        cur.execute("SELECT id, source_name, raw_html FROM raw_reports WHERE is_processed = FALSE")
        reports = [{"id": str(row[0]), "source_name": row[1], "raw_html": row[2]} for row in cur.fetchall()]

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
            try:
                rows = parse_extraction(raw_json, report["id"], report["source_name"])
            except ExtractionParseError:
                logger.error(f"  Unparseable response for {report['source_name']} ({report['id'][:8]}...)")
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
                    cur.execute(
                        """
                        INSERT INTO parsed_reports
                            (raw_report_id, water_body_id, source_name, report_date,
                             sentiment, species_mentioned, fly_patterns_mentioned,
                             conditions_summary, flow_commentary, water_clarity,
                             hatches, river_section, raw_extraction)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            row["raw_report_id"],
                            water_body_id,
                            row["source_name"],
                            row.get("report_date"),
                            row.get("sentiment"),
                            row.get("species_mentioned", []),
                            row.get("fly_patterns_mentioned", []),
                            row.get("conditions_summary"),
                            row.get("flow_commentary"),
                            row.get("water_clarity"),
                            json.dumps(row.get("hatches", [])),
                            row.get("river_section"),
                            json.dumps(row.get("raw_extraction")),
                        ),
                    )
                    cur.execute("RELEASE SAVEPOINT extract_insert")
                    total_extracted += 1
                    rows_inserted += 1
                except Exception:
                    logger.exception(f"  DB insert error for water body: {wb_name}")
                    cur.execute("ROLLBACK TO SAVEPOINT extract_insert")
                    cur.execute("RELEASE SAVEPOINT extract_insert")

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

        return failures

    except Exception:
        logger.exception("Fatal error in extraction job")
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
