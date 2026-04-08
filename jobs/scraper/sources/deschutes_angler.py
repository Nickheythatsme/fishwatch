from playwright.async_api import Page

from .base import BaseScraper


class DeschutesAnglerScraper(BaseScraper):
    """Scraper for Deschutes Angler fishing reports.

    Shopify blog with minimal markup. Links at /blogs/fishing-report/[slug].
    Content in .rte (Shopify Rich Text Editor).
    """

    def __init__(self):
        super().__init__(
            name="deschutes_angler",
            url="https://deschutesangler.com/blogs/fishing-report",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "a[href*='/blogs/fishing-report/']",
            "els => els.map(el => el.href).filter(h => h && h.includes('/blogs/fishing-report/'))",
        )
        return list(dict.fromkeys(l for l in links if l.rstrip("/") != self.url.rstrip("/")))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(page, ".rte", "article .blog-post", "article")
        return text
