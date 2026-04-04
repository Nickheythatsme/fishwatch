"""Async entry point for the scrape job. Fetches reports from all configured sources."""

import asyncio
import logging

from db import get_connection
from .sources.confluence import ConfluenceScraper
from .sources.fly_fishers import FlyFishersScraper
from .sources.fly_and_field import FlyAndFieldScraper
from .sources.deschutes_angler import DeschutesAnglerScraper
from .sources.deschutes_camp import DeschutesCampScraper
from .sources.odfw import ODFWScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRAPERS = [
    ConfluenceScraper(),
    FlyFishersScraper(),
    FlyAndFieldScraper(),
    DeschutesAnglerScraper(),
    DeschutesCampScraper(),
    ODFWScraper(),
]


async def main() -> None:
    conn = get_connection()
    cur = conn.cursor()
    total_saved = 0

    for scraper in SCRAPERS:
        try:
            results = await scraper.run()
        except Exception as e:
            logger.error(f"Failed to scrape {scraper.name}: {e}")
            continue

        for result in results:
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

    conn.commit()
    cur.close()
    conn.close()
    logger.info(f"Scrape complete. {total_saved} new reports saved.")


def run() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    run()
