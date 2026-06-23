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

    WordPress blog. Uses the /category/fishing-reports/feed/ RSS feed to discover
    report post URLs — more reliable than CSS selectors on the HTML index since the
    RSS endpoint is unaffected by bot-detection measures that block headless browsers.
    Filters out travel reports (Christmas Island, Alaska, etc.) by URL keyword.
    Content in .entry-content.
    """

    index_ready_selector = _INDEX_READY_SELECTOR
    index_ready_state = "attached"

    def __init__(self):
        super().__init__(
            name="caddis_fly",
            url="https://oregonflyfishingblog.com/category/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(_RSS_URL, timeout=30)
            resp.raise_for_status()
        root = ET.fromstring(resp.text)
        links = [item.findtext("link") or "" for item in root.iter("item")]
        return [l for l in dict.fromkeys(links) if l and not any(kw in l.lower() for kw in _SKIP_KEYWORDS)]

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".entry-content")
        return text
