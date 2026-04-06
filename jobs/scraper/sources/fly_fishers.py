from playwright.async_api import Page

from .base import BaseScraper


class FlyFishersScraper(BaseScraper):
    """Scraper for The Fly Fishers Place fishing reports.

    WordPress.com blog. Index has li.listing-item elements with title links.
    Posts at /YYYY/MM/DD/[slug]/.
    """

    def __init__(self):
        super().__init__(
            name="fly_fishers_place",
            url="https://flyfishersplace.com/category/fishing-reports/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "li.listing-item a.title, .entry-title a, article a[rel='bookmark']",
            "els => els.map(el => el.href).filter(Boolean)",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector(".entry-content, .site-content .entry-content, article .entry-content")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
