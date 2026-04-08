from playwright.async_api import Page

from .base import BaseScraper


class DeschutesCampScraper(BaseScraper):
    """Scraper for Deschutes River Camp fishing reports.

    WordPress blog. Index lists posts linked from article/heading elements.
    Tries standard WordPress permalink selectors across themes:
    - article a[rel='bookmark'] — permalink attribute added by WordPress core
    - .wp-block-post-title a    — Gutenberg/block-editor archive template
    - .entry-title a            — classic themes (Twenty*, Progression, etc.)
    Content in .entry-content (classic) or .wp-block-post-content (block).
    """

    def __init__(self):
        super().__init__(
            name="deschutes_camp",
            url="https://deschutescamp.com/fishing-report/",
        )

    async def discover_posts(self, page: Page) -> list[str]:
        links = await page.eval_on_selector_all(
            "article a[rel='bookmark'], .wp-block-post-title a, h2.entry-title a, h1.entry-title a, .entry-title a",
            "els => els.map(el => el.href).filter(Boolean)",
        )
        return list(dict.fromkeys(links))

    async def extract_content(self, page: Page) -> str:
        text, self._body_fallback_used = await self._query_content(
            page, ".entry-content", ".wp-block-post-content", "article"
        )
        return text
