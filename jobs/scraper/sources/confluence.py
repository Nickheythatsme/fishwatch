from playwright.async_api import Page

from .base import BaseScraper


class ConfluenceScraper(BaseScraper):
    """Scraper for Confluence Fly Shop fishing reports.

    WordPress/Elementor site. Index has CTA blocks linking to per-location
    report pages (e.g. /fishing-report/lower-deschutes-river/).
    Reports are overwritten per location, not archived chronologically.
    """

    def __init__(self):
        super().__init__(
            name="confluence_fly_shop",
            url="https://confluenceflyshop.com/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            ".elementor-cta a, .elementor-cta__button, a[href*='/fishing-report/']",
            "els => els.map(el => el.href).filter(h => h && h.includes('/fishing-report/'))",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(
            page, ".progression-blog-content", ".entry-content", "article"
        )
        return text
