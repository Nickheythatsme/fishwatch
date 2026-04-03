"""Entry point for the scrape job. Fetches reports from all configured sources."""

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

from .config import SHOP_SOURCES
from .sources.confluence import ConfluenceScraper
from .sources.fly_fishers import FlyFishersScraper
from .sources.fly_and_field import FlyAndFieldScraper
from .sources.deschutes_angler import DeschutesAnglerScraper
from .sources.deschutes_camp import DeschutesCampScraper
from .sources.odfw import ODFWScraper

load_dotenv()

SCRAPERS = {
    "confluence": ConfluenceScraper,
    "fly_fishers": FlyFishersScraper,
    "fly_and_field": FlyAndFieldScraper,
    "deschutes_angler": DeschutesAnglerScraper,
    "deschutes_camp": DeschutesCampScraper,
    "odfw": ODFWScraper,
}


def run() -> None:
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

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
        response = supabase.table("raw_reports").upsert(
            result, on_conflict="source_name,content_hash"
        ).execute()

        if response.data:
            print(f"Saved report from {source['name']}")
        else:
            print(f"No new content from {source['name']}")


if __name__ == "__main__":
    run()
