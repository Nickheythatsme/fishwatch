from __future__ import annotations

import hashlib
import logging
import os
import traceback as tb
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from urllib.parse import urljoin

from playwright.async_api import Browser, Page
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from ..models import ScraperHealthError, ScraperResult, ScraperStatus

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all fishing report scrapers using Playwright."""

    single_page: bool = False
    goto_timeout_ms: int = 30_000
    goto_wait_until: str = "domcontentloaded"
    # Optional selector that must appear on the index page before discover_posts runs.
    # Guards against stub/cached responses or DOM that's not yet populated when
    # domcontentloaded fires.
    index_ready_selector: str | None = None
    index_ready_state: str = "visible"

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url
        self._body_fallback_used = False

    async def _goto_index(self, page: Page) -> None:
        """Navigate to the index URL with one retry on timeout, then wait for the index
        to be ready if a selector is configured."""
        try:
            await page.goto(self.url, wait_until=self.goto_wait_until, timeout=self.goto_timeout_ms)
        except PlaywrightTimeoutError:
            logger.warning(f"[{self.name}] index goto timed out after {self.goto_timeout_ms}ms, retrying")
            await page.goto(self.url, wait_until=self.goto_wait_until, timeout=self.goto_timeout_ms * 2)
        if self.index_ready_selector:
            await page.wait_for_selector(
                self.index_ready_selector,
                state=self.index_ready_state,
                timeout=self.goto_timeout_ms,
            )

    async def _query_content(self, page: Page, *selectors: str) -> tuple[str, bool]:
        """Try selectors in order. Returns (text, used_body_fallback)."""
        for sel in selectors:
            el = await page.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                if text:
                    return text, False
        return (await page.inner_text("body")).strip(), True

    async def _save_debug_artifacts(self, page: Page, url: str, error: Exception) -> list[str]:
        """Save screenshot, HTML, and error details for debugging. Returns artifact paths."""
        artifact_dir = os.environ.get("SCRAPER_ARTIFACT_DIR", "artifacts")
        timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%f")
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:12]
        dest = os.path.join(artifact_dir, self.name, f"{timestamp}-{url_hash}")
        paths: list[str] = []

        try:
            os.makedirs(dest, exist_ok=True)
        except Exception:
            logger.warning(f"[{self.name}] Failed to create artifact directory", exc_info=True)
            return paths

        screenshot_path = os.path.join(dest, "screenshot.png")
        try:
            await page.screenshot(path=screenshot_path, full_page=True)
            paths.append(screenshot_path)
        except Exception:
            logger.warning(f"[{self.name}] Failed to save screenshot", exc_info=True)

        html_path = os.path.join(dest, "page.html")
        try:
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(await page.content())
            paths.append(html_path)
        except Exception:
            logger.warning(f"[{self.name}] Failed to save HTML snapshot", exc_info=True)

        error_path = os.path.join(dest, "error.txt")
        try:
            with open(error_path, "w", encoding="utf-8") as f:
                f.write(f"URL: {url}\n")
                f.write(f"Error: {error}\n\n")
                f.write("".join(tb.format_exception(type(error), error, error.__traceback__)))
            paths.append(error_path)
        except Exception:
            logger.warning(f"[{self.name}] Failed to save error details", exc_info=True)

        return paths

    async def run(self, browser: Browser, known_hashes: set[str] | None = None) -> ScraperResult:
        """Scrape using a shared browser instance. Returns a ScraperResult."""
        raw_reports: list[dict] = []
        posts_extracted = 0
        posts_failed = 0
        body_fallback_used = False
        artifact_paths: list[str] = []
        context = await browser.new_context(user_agent="Score.Fish/1.0 (fishing report aggregator)")
        context.set_default_timeout(self.goto_timeout_ms)

        try:
            page = await context.new_page()
            await self._goto_index(page)
            post_urls = await self.discover_posts(page)
            logger.info(f"[{self.name}] Discovered {len(post_urls)} posts")

            if not post_urls and not self.single_page:
                raise ScraperHealthError(f"{self.name}: discover_posts returned 0 URLs — possible layout change")

            for post_url in post_urls:
                try:
                    absolute_url = urljoin(self.url, post_url)

                    # Skip re-navigation if already on this page (e.g. ODFW single-page)
                    if absolute_url != page.url:
                        await page.goto(absolute_url, wait_until=self.goto_wait_until)

                    self._body_fallback_used = False
                    records = await self.extract_records(page, absolute_url)

                    if self._body_fallback_used:
                        body_fallback_used = True
                        logger.warning(f"[{self.name}] Selector fallback to body on {absolute_url}")

                    # A page can yield multiple records (e.g. a forum thread's
                    # original post plus high-engagement replies). Each becomes its
                    # own raw_report with an independent content hash and metadata.
                    raw_html = await page.content()
                    page_extracted = False
                    for record in records:
                        content = record.get("content")
                        if not content or not content.strip():
                            continue
                        page_extracted = True
                        content_hash = hashlib.sha256(content.encode()).hexdigest()

                        if known_hashes and content_hash in known_hashes:
                            logger.debug(f"[{self.name}] Unchanged: {record.get('source_url', absolute_url)}")
                            continue

                        raw_reports.append(
                            {
                                "source_name": self.name,
                                "source_url": record.get("source_url", absolute_url),
                                "raw_html": record.get("raw_html", raw_html),
                                "content_hash": content_hash,
                                "fetched_at": datetime.now(UTC).isoformat(),
                                "metadata": record.get("metadata") or {},
                            }
                        )

                    if not page_extracted:
                        logger.warning(f"[{self.name}] Empty content from {absolute_url}")
                        continue

                    posts_extracted += 1
                except Exception as exc:
                    logger.exception(f"[{self.name}] Error on {post_url}")
                    posts_failed += 1
                    artifact_paths.extend(await self._save_debug_artifacts(page, absolute_url, exc))
                    continue
        finally:
            await context.close()

        status = ScraperStatus.SUCCESS
        if len(post_urls) > 0 and posts_extracted == 0:
            status = ScraperStatus.FAILED
        elif posts_failed > 0 or body_fallback_used:
            status = ScraperStatus.DEGRADED

        return ScraperResult(
            source_name=self.name,
            source_url=self.url,
            status=status,
            posts_discovered=len(post_urls),
            posts_extracted=posts_extracted,
            posts_failed=posts_failed,
            body_fallback_used=body_fallback_used,
            artifact_paths=artifact_paths,
            raw_reports=raw_reports,
        )

    @abstractmethod
    async def discover_posts(self, page: Page) -> list[str]:
        """Given the index page, return URLs of individual report posts."""
        ...

    async def extract_records(self, page: Page, url: str) -> list[dict]:
        """Given an individual post page, return one or more report records.

        Each record is a dict with keys:
            content    — the report text (used for hashing/dedup); required
            source_url — per-record permalink (defaults to the page URL)
            raw_html   — per-record HTML (defaults to the full page HTML)
            metadata   — source-specific extras stored on raw_reports.metadata

        The default wraps extract_content() into a single record, so the common
        one-report-per-page scrapers only implement extract_content. Multi-record
        sources (e.g. a forum thread → original post + high-engagement replies)
        override this method instead.
        """
        content = await self.extract_content(page)
        return [{"content": content, "source_url": url, "metadata": {}}]

    async def extract_content(self, page: Page) -> str:
        """Given an individual post page, extract the report text content.

        Subclasses implement this for the common single-report-per-page case.
        Subclasses that override extract_records do not need to implement it.
        """
        raise NotImplementedError(f"{type(self).__name__} must implement extract_content or override extract_records")
