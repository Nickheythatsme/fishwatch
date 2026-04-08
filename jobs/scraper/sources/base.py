import hashlib
import logging
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from urllib.parse import urljoin

from playwright.async_api import Browser, Page

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all fishing report scrapers using Playwright."""

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url

    async def run(self, browser: Browser, known_hashes: set[str] | None = None) -> list[dict]:
        """Scrape using a shared browser instance. Returns list of raw_report dicts.

        If known_hashes is provided, pages whose content hash is already in the
        set are skipped — saving memory (no raw_html) and DB round-trips.
        """
        results: list[dict] = []
        context = await browser.new_context(user_agent="FishSignal/1.0 (fishing report aggregator)")
        context.set_default_timeout(30_000)

        try:
            page = await context.new_page()
            await page.goto(self.url, wait_until="domcontentloaded")
            post_urls = await self.discover_posts(page)
            logger.info(f"[{self.name}] Discovered {len(post_urls)} posts")

            for post_url in post_urls:
                try:
                    absolute_url = urljoin(self.url, post_url)

                    # Skip re-navigation if already on this page (e.g. ODFW single-page)
                    if absolute_url != page.url:
                        await page.goto(absolute_url, wait_until="domcontentloaded")

                    content = await self.extract_content(page)
                    if not content or not content.strip():
                        logger.warning(f"[{self.name}] Empty content from {absolute_url}")
                        continue

                    content_hash = hashlib.sha256(content.encode()).hexdigest()

                    if known_hashes and content_hash in known_hashes:
                        logger.debug(f"[{self.name}] Unchanged: {absolute_url}")
                        continue

                    raw_html = await page.content()
                    results.append(
                        {
                            "source_name": self.name,
                            "source_url": absolute_url,
                            "raw_html": raw_html,
                            "content_hash": content_hash,
                            "fetched_at": datetime.now(UTC).isoformat(),
                        }
                    )
                except Exception:
                    logger.exception(f"[{self.name}] Error on {post_url}")
                    continue
        finally:
            await context.close()

        return results

    @abstractmethod
    async def discover_posts(self, page: Page) -> list[str]:
        """Given the index page, return URLs of individual report posts."""
        ...

    @abstractmethod
    async def extract_content(self, page: Page) -> str:
        """Given an individual post page, extract the report text content."""
        ...
