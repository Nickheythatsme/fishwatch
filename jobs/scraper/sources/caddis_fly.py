import xml.etree.ElementTree as ET

import httpx
from playwright.async_api import Page

from .base import BaseScraper

# Travel/out-of-scope keywords in post URLs to skip
_SKIP_KEYWORDS = ["christmas-island", "alaska", "jungle", "belize", "bahamas", "mexico", "patagonia", "chile"]
_INDEX_READY_SELECTOR = "#content, #main, body"
_RSS_URL = "https://oregonflyfishingblog.com/category/fishing-reports/feed/"


class CaddisFlyScraper(BaseScraper):
    """Scraper for The Caddis Fly / Oregon Fly Fishing Blog.

    WordPress blog. Discovers report post URLs from the
    /category/fishing-reports/feed/ RSS feed rather than CSS selectors on the HTML
    index: the site's bot-detection blocks the headless browser, so selector-based
    discovery returned 0 URLs and hard-failed the scrape job (issue #74). The RSS
    endpoint is plain XML over HTTP and is unaffected, so discovery is reliable.
    Individual posts are still fetched with the shared browser; report content lives
    in .entry-content. Filters out travel reports (Christmas Island, Alaska, etc.)
    by URL keyword.
    """

    # The base run() still loads the index page before discover_posts; keep a lenient
    # readiness selector so that step doesn't hard-fail on the bot-detection DOM.
    index_ready_selector = _INDEX_READY_SELECTOR
    index_ready_state = "attached"

    def __init__(self):
        super().__init__(
            name="caddis_fly",
            url="https://oregonflyfishingblog.com/category/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        """Discover post URLs from the WordPress RSS feed (bot-detection-proof)."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(_RSS_URL, timeout=30)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
        # Only <item> links are posts; the channel-level <link> is excluded by iter("item").
        links = [link for item in root.iter("item") if (link := item.findtext("link"))]
        return [l for l in dict.fromkeys(links) if not any(kw in l.lower() for kw in _SKIP_KEYWORDS)]

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".entry-content")
        return text
