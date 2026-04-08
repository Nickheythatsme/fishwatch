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
            'article a[rel="bookmark"], .entry-title a',
            "els => els.map(el => el.href)",
        )
        return [l for l in dict.fromkeys(links) if not any(kw in l.lower() for kw in _SKIP_KEYWORDS)]

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(".entry-content")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
