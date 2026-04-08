from playwright.async_api import Page

from .base import BaseScraper


class FlyFishFoodScraper(BaseScraper):
    """Scraper for Fly Fish Food fishing reports.

    Shopify blog. Index at /blogs/fly-fishing-reports lists per-river reports.
    Reports are static URLs updated in-place (not date-stamped posts),
    so content_hash deduplication is essential.
    Content in .rte inside article.article.
    """

    def __init__(self):
        super().__init__(
            name="fly_fish_food",
            url="https://www.flyfishfood.com/blogs/fly-fishing-reports",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "a[href*='/blogs/fly-fishing-reports/']",
            "els => els.map(el => el.href).filter(h => h && h.includes('/blogs/fly-fishing-reports/'))",
        )
        # Dedupe and exclude the index page itself and tag pages
        return list(dict.fromkeys(l for l in links if l.rstrip("/") != self.url.rstrip("/") and "/tagged/" not in l))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(
            page, "article .rte", ".article__content.rte", ".rte"
        )
        return text
