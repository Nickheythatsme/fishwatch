from playwright.async_api import Page

from .base import BaseScraper


class SilverCreekOutfittersScraper(BaseScraper):
    """Scraper for Silver Creek Outfitters fishing reports.

    WordPress blog. Index at /category/fishing-forecast/fishing-report/
    lists biweekly fishing forecast posts covering Silver Creek,
    Big Wood River, Big Lost River, and SF Boise.
    Content in .post-content.
    """

    def __init__(self):
        super().__init__(
            name="silver_creek_outfitters",
            url="https://silver-creek.com/category/fishing-forecast/fishing-report/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "article h2 a",
            "els => els.map(el => el.href)",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".post-content", ".entry-content")
        return text
