from playwright.async_api import Page

from .base import BaseScraper


class DeschutesCampScraper(BaseScraper):
    """Scraper for Deschutes River Camp fishing reports.

    WordPress with Progression theme. Index has h2.progression-blog-title links.
    Content in .progression-blog-content.
    """

    def __init__(self):
        super().__init__(
            name="deschutes_camp",
            url="https://deschutescamp.com/fishing-report/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            ".progression-blog-title a, h2.entry-title a, .entry-title a",
            "els => els.map(el => el.href).filter(Boolean)",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(
            page, ".progression-blog-content", ".entry-content", "article"
        )
        return text
