"""Entry point for the scrape job. Fetches reports from all configured sources."""

from ..db import get_connection
from .config import SHOP_SOURCES
from .sources.confluence import ConfluenceScraper
from .sources.fly_fishers import FlyFishersScraper
from .sources.fly_and_field import FlyAndFieldScraper
from .sources.deschutes_angler import DeschutesAnglerScraper
from .sources.deschutes_camp import DeschutesCampScraper
from .sources.odfw import ODFWScraper

SCRAPERS = {
    "confluence": ConfluenceScraper,
    "fly_fishers": FlyFishersScraper,
    "fly_and_field": FlyAndFieldScraper,
    "deschutes_angler": DeschutesAnglerScraper,
    "deschutes_camp": DeschutesCampScraper,
    "odfw": ODFWScraper,
}


def run() -> None:
    conn = get_connection()
    cur = conn.cursor()

    for source in SHOP_SOURCES:
        scraper_cls = SCRAPERS.get(source["scraper"])
        if not scraper_cls:
            print(f"No scraper for {source['scraper']}, skipping")
            continue

        scraper = scraper_cls()
        try:
            result = scraper.fetch()
        except Exception as e:
            print(f"Error scraping {source['name']}: {e}")
            continue

        # Upsert — skip if content_hash already exists for this source
        cur.execute(
            """
            INSERT INTO raw_reports (source_name, source_url, raw_html, content_hash, fetched_at)
            VALUES (%(source_name)s, %(source_url)s, %(raw_html)s, %(content_hash)s, %(fetched_at)s)
            ON CONFLICT (source_name, content_hash) DO NOTHING
            RETURNING id
            """,
            result,
        )
        row = cur.fetchone()
        if row:
            print(f"Saved report from {source['name']}")
        else:
            print(f"No new content from {source['name']}")

    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    run()
