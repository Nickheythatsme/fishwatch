from playwright.async_api import Page

from .base import BaseScraper

# Travel/out-of-scope keywords in post URLs to skip
_SKIP_KEYWORDS = ["christmas-island", "alaska", "jungle", "belize", "bahamas", "mexico", "patagonia", "chile"]
_INDEX_LINK_SELECTOR = 'h2.entry-title a, .entry-title a[rel="bookmark"], .post-title a'
_INDEX_READY_SELECTOR = "#content, #main, body"


class CaddisFlyScraper(BaseScraper):
    """Scraper for The Caddis Fly / Oregon Fly Fishing Blog.

    WordPress blog. Uses the /category/fishing-reports/ index to find report posts.
    Filters out travel reports (Christmas Island, Alaska, etc.) by URL keyword.
    Content in .entry-content.
    """

    # Wait for stable WordPress container markup before discovering report links.
    # This avoids brittle failures when title-link selectors intermittently fail to
    # attach even though the page has loaded.
    index_ready_selector = _INDEX_READY_SELECTOR
    index_ready_state = "attached"

    def __init__(self):
        super().__init__(
            name="caddis_fly",
            url="https://oregonflyfishingblog.com/category/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            _INDEX_LINK_SELECTOR,
            "els => els.map(el => el.href)",
        )
        return [l for l in dict.fromkeys(links) if not any(kw in l.lower() for kw in _SKIP_KEYWORDS)]

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".entry-content")
        return text
