from playwright.async_api import Page

from .base import BaseScraper

# Travel/out-of-scope keywords in post URLs to skip
_SKIP_KEYWORDS = ["christmas-island", "alaska", "jungle", "belize", "bahamas", "mexico", "patagonia", "chile"]


class CaddisFlyScraper(BaseScraper):
    """Scraper for The Caddis Fly / Oregon Fly Fishing Blog.

    WordPress blog. Uses the /category/fishing-reports/ index to find report posts.
    Filters out travel reports (Christmas Island, Alaska, etc.) by URL keyword.
    Content in .entry-content.
    """

    def __init__(self):
        super().__init__(
            name="caddis_fly",
            url="https://oregonflyfishingblog.com/category/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            'article a[rel="bookmark"], .entry-title a, h2.entry-title a, .wp-block-post-title a',
            "els => els.map(el => el.href)",
        )
        # Fallback: discover posts by URL pattern (date-based WordPress permalinks)
        # This is resilient to theme changes that alter class names / rel attributes.
        if not links:
            _js = r"els => els.map(el => el.href).filter(h => /\/\d{4}\/\d{2}\/\d{2}\//.test(h))"
            links = await page.eval_on_selector_all("a[href]", _js)
        return [l for l in dict.fromkeys(links) if not any(kw in l.lower() for kw in _SKIP_KEYWORDS)]

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".entry-content")
        return text
