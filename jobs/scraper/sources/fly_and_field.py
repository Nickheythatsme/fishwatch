from playwright.async_api import Page

from .base import BaseScraper


class FlyAndFieldScraper(BaseScraper):
    """Scraper for Fly and Field Outfitters fishing reports.

    Shopify blog. Index has blog detail blocks with "Read more" links.
    Posts at /blogs/fishing-reports/[slug].
    Content in .article__content.rte (Shopify Rich Text Editor).
    """

    def __init__(self):
        super().__init__(
            name="fly_and_field",
            url="https://flyandfield.com/blogs/fishing-reports",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "a[href*='/blogs/fishing-reports/']",
            "els => els.map(el => el.href).filter(h => h && h.includes('/blogs/fishing-reports/'))",
        )
        # Filter out the index page itself
        return list(dict.fromkeys(l for l in links if l.rstrip("/") != self.url.rstrip("/")))

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(".article__content.rte, .article__content, .rte")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
