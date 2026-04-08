"""Async entry point for the scrape job. Fetches reports from all configured sources."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import traceback as tb
from datetime import UTC, datetime

from playwright.async_api import async_playwright

from db import get_connection

from .models import ScraperHealthError, ScraperResult, ScraperStatus
from .sources.caddis_fly import CaddisFlyScraper
from .sources.confluence import ConfluenceScraper
from .sources.deschutes_angler import DeschutesAnglerScraper
from .sources.deschutes_camp import DeschutesCampScraper
from .sources.fly_and_field import FlyAndFieldScraper
from .sources.fly_fish_food import FlyFishFoodScraper
from .sources.fly_fishers import FlyFishersScraper
from .sources.odfw import ODFW_ZONES, ODFWScraper
from .sources.silver_bow import SilverBowScraper
from .sources.silver_creek_outfitters import SilverCreekOutfittersScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRAPERS = [
    # Oregon fly shops
    CaddisFlyScraper(),
    ConfluenceScraper(),
    FlyFishersScraper(),
    FlyAndFieldScraper(),
    DeschutesAnglerScraper(),
    DeschutesCampScraper(),
    # Washington fly shops
    SilverBowScraper(),
    # Idaho fly shops
    FlyFishFoodScraper(),
    SilverCreekOutfittersScraper(),
    # ODFW zones (Oregon state agency)
    *[ODFWScraper(zone_slug=zone) for zone in ODFW_ZONES],
]


def _write_summary(scraper_results: list[ScraperResult], db_failures: int = 0) -> None:
    """Write a JSON summary of all scraper results to the artifact directory."""
    artifact_dir = os.environ.get("SCRAPER_ARTIFACT_DIR", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    summary_path = os.path.join(artifact_dir, "scrape_summary.json")
    summary = {
        "run_at": datetime.now(UTC).isoformat(),
        "total_scrapers": len(scraper_results),
        "failed": sum(1 for r in scraper_results if r.status == ScraperStatus.FAILED),
        "degraded": sum(1 for r in scraper_results if r.status == ScraperStatus.DEGRADED),
        "db_failures": db_failures,
        "results": [r.to_dict() for r in scraper_results],
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"Summary written to {summary_path}")


async def main() -> int:
    conn = get_connection()
    cur = conn.cursor()
    total_saved = 0
    db_failures = 0
    scraper_results: list[ScraperResult] = []

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            try:
                for scraper in SCRAPERS:
                    try:
                        # Load known hashes for this source only
                        cur.execute(
                            "SELECT content_hash FROM raw_reports WHERE source_name = %s",
                            (scraper.name,),
                        )
                        known = {row[0] for row in cur.fetchall()}
                        result = await scraper.run(browser, known_hashes=known)
                        scraper_results.append(result)
                    except ScraperHealthError as exc:
                        logger.error(f"Health check failed for {scraper.name}: {exc}")
                        scraper_results.append(
                            ScraperResult(
                                source_name=scraper.name,
                                source_url=scraper.url,
                                status=ScraperStatus.FAILED,
                                error_message=str(exc),
                                traceback=tb.format_exc(),
                            )
                        )
                        continue
                    except Exception as exc:
                        logger.exception(f"Failed to scrape {scraper.name}")
                        scraper_results.append(
                            ScraperResult(
                                source_name=scraper.name,
                                source_url=scraper.url,
                                status=ScraperStatus.FAILED,
                                error_message=str(exc),
                                traceback=tb.format_exc(),
                            )
                        )
                        continue

                    for report in result.raw_reports:
                        try:
                            cur.execute("SAVEPOINT raw_report_insert")
                            cur.execute(
                                """
                                INSERT INTO raw_reports
                                    (source_name, source_url, raw_html, content_hash, fetched_at)
                                VALUES
                                    (%(source_name)s, %(source_url)s, %(raw_html)s,
                                     %(content_hash)s, %(fetched_at)s)
                                ON CONFLICT (source_name, content_hash) DO NOTHING
                                RETURNING id
                                """,
                                report,
                            )
                            row = cur.fetchone()
                            if row:
                                logger.info(f"Saved: {report['source_url']}")
                                total_saved += 1
                            else:
                                logger.debug(f"Dedup skip: {report['source_url']}")
                            cur.execute("RELEASE SAVEPOINT raw_report_insert")
                        except Exception:
                            logger.exception(f"DB error for {report['source_url']}")
                            cur.execute("ROLLBACK TO SAVEPOINT raw_report_insert")
                            cur.execute("RELEASE SAVEPOINT raw_report_insert")
                            db_failures += 1
            finally:
                await browser.close()

        conn.commit()

        failures = sum(1 for r in scraper_results if r.status == ScraperStatus.FAILED)
        degraded = sum(1 for r in scraper_results if r.status == ScraperStatus.DEGRADED)
        logger.info(f"Scrape complete. {total_saved} saved. {failures} failures, {degraded} degraded.")

        _write_summary(scraper_results, db_failures=db_failures)

        return failures + db_failures
    except Exception:
        logger.exception("Fatal error in scrape job")
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()


def run() -> int:
    return asyncio.run(main())


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
