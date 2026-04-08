from playwright.async_api import Page

from .base import BaseScraper


class SilverBowScraper(BaseScraper):
    """Scraper for Silver Bow Fly Shop fishing reports.

    Magento single-page report. All river reports inline on one page,
    organized by H2 headings (NF CDA, St. Joe, Spokane, Steelhead).
    Each section has Hatches, The Fishing, and Current Flow sub-sections.
    Content in main element.
    """

    single_page = True

    def __init__(self):
        super().__init__(
            name="silver_bow",
            url="https://www.silverbowflyshop.com/fishingreports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        return [self.url]

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, "main")
        return text
