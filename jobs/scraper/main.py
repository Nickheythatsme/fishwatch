"""Async entry point for the scrape job. Fetches reports from all configured sources."""

import asyncio
import logging
import sys

from playwright.async_api import async_playwright

from db import get_connection

from .sources.caddis_fly import CaddisFlyScraper
from .sources.confluence import ConfluenceScraper
from .sources.deschutes_angler import DeschutesAnglerScraper
from .sources.deschutes_camp import DeschutesCampScraper
from .sources.fly_and_field import FlyAndFieldScraper
from .sources.fly_fishers import FlyFishersScraper
from .sources.fly_fish_food import FlyFishFoodScraper
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


async def main() -> int:
    conn = get_connection()
    cur = conn.cursor()
    total_saved = 0
    failures = 0

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            try:
                for scraper in SCRAPERS:
                    try:
                        results = await scraper.run(browser)
                    except Exception:
                        logger.exception(f"Failed to scrape {scraper.name}")
                        failures += 1
                        continue

                    for result in results:
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
                                result,
                            )
                            row = cur.fetchone()
                            if row:
                                logger.info(f"Saved: {result['source_url']}")
                                total_saved += 1
                            else:
                                logger.debug(f"Dedup skip: {result['source_url']}")
                            cur.execute("RELEASE SAVEPOINT raw_report_insert")
                        except Exception:
                            logger.exception(f"DB error for {result['source_url']}")
                            cur.execute("ROLLBACK TO SAVEPOINT raw_report_insert")
                            cur.execute("RELEASE SAVEPOINT raw_report_insert")
                            failures += 1
            finally:
                await browser.close()

        conn.commit()
        logger.info(f"Scrape complete. {total_saved} new reports saved.")
        return failures
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
