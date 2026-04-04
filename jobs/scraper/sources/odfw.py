from playwright.async_api import Page

from .base import BaseScraper


class ODFWScraper(BaseScraper):
    """Scraper for ODFW Central Zone fishing reports.

    Government single-page report. All content on one page, no individual
    posts to navigate into. discover_posts returns [self.url].
    """

    def __init__(self):
        super().__init__(
            name="odfw_central_zone",
            url="https://myodfw.com/recreation-report/fishing-report/central-zone",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        return [self.url]

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(
            "#main-content, .field--name-body, .node__content"
        )
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
