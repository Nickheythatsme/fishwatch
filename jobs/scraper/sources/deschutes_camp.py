from playwright.async_api import Page

from .base import BaseScraper


class DeschutesCampScraper(BaseScraper):
    """Scraper for Deschutes River Camp fishing reports.

    WordPress with Progression theme. Index has h2.entry-title links.
    Content in .progression-blog-content.
    """

    def __init__(self):
        super().__init__(
            name="deschutes_camp",
            url="https://deschutescamp.com/fishing-report/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "h2.entry-title a, .entry-title a",
            "els => els.map(el => el.href).filter(Boolean)",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(".progression-blog-content, .entry-content, article")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
