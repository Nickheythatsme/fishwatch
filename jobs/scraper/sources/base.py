import hashlib
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all fishing report scrapers using Playwright."""

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url

    async def run(self) -> list[dict]:
        """Full scrape lifecycle. Returns list of raw_report dicts."""
        results: list[dict] = []
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="FishSignal/1.0 (fishing report aggregator)"
            )
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
                        results.append({
                            "source_name": self.name,
                            "source_url": absolute_url,
                            "raw_html": content,
                            "content_hash": content_hash,
                            "fetched_at": datetime.now(timezone.utc).isoformat(),
                        })
                    except Exception as e:
                        logger.error(f"[{self.name}] Error on {post_url}: {e}")
                        continue
            finally:
                await browser.close()

        return results

    @abstractmethod
    async def discover_posts(self, page: Page) -> list[str]:
        """Given the index page, return URLs of individual report posts."""
        ...

    @abstractmethod
    async def extract_content(self, page: Page) -> str:
        """Given an individual post page, extract the report text content."""
        ...
