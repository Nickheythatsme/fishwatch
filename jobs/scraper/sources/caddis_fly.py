from playwright.async_api import Page

from .base import BaseScraper


class CaddisFlyScraper(BaseScraper):
    """Scraper for The Caddis Fly / Oregon Fly Fishing Blog.

    WordPress blog. Uses the /category/fishing-reports/ index to find report posts.
    Mix of local Oregon reports and travel reports — extractor handles filtering.
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
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(".entry-content")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
