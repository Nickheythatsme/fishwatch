"""Tests for the Caddis Fly scraper's index readiness + RSS-based post discovery."""

import asyncio
from unittest.mock import AsyncMock

from scraper.sources import caddis_fly
from scraper.sources.caddis_fly import CaddisFlyScraper

# Minimal WordPress-style RSS sample: a channel <link> (must be ignored) plus four
# <item>s — including a duplicate and a travel post that must be filtered out.
_SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <link>https://oregonflyfishingblog.com</link>
    <item><link>https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/</link></item>
    <item><link>https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/</link></item>
    <item><link>https://oregonflyfishingblog.com/2026/03/04/christmas-island-report-january-2026/</link></item>
    <item><link>https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/</link></item>
  </channel>
</rss>"""


class _FakeResponse:
    def __init__(self, text: str):
        self.text = text

    def raise_for_status(self) -> None:
        pass


class _FakeAsyncClient:
    def __init__(self, text: str):
        self._text = text
        self.requested_url: str | None = None
        self.requested_headers: dict[str, str] | None = None

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *exc) -> bool:
        return False

    async def get(self, url: str, timeout: int | None = None, headers: dict[str, str] | None = None) -> _FakeResponse:
        self.requested_url = url
        self.requested_headers = headers
        return _FakeResponse(self._text)


def test_caddis_fly_waits_for_attached_index_links():
    scraper = CaddisFlyScraper()
    page = AsyncMock()

    asyncio.run(scraper._goto_index(page))

    page.goto.assert_awaited_once_with(
        scraper.url,
        wait_until=scraper.goto_wait_until,
        timeout=scraper.goto_timeout_ms,
    )
    page.wait_for_selector.assert_awaited_once_with(
        scraper.index_ready_selector,
        state="attached",
        timeout=scraper.goto_timeout_ms,
    )


def test_caddis_fly_discovers_links_from_rss_and_filters_travel_posts(monkeypatch):
    scraper = CaddisFlyScraper()
    fake_client = _FakeAsyncClient(_SAMPLE_RSS)
    monkeypatch.setattr(caddis_fly.httpx, "AsyncClient", lambda *a, **k: fake_client)

    # discover_posts pulls from the RSS feed, not the browser page.
    links = asyncio.run(scraper.discover_posts(AsyncMock()))

    assert fake_client.requested_url == caddis_fly._RSS_URL
    # Browser-like headers are sent so the WAF doesn't bounce the request with 415 (issue #133).
    assert fake_client.requested_headers == caddis_fly._RSS_HEADERS
    assert "Mozilla/5.0" in fake_client.requested_headers["User-Agent"]
    # Channel <link> ignored, duplicate collapsed, christmas-island travel post filtered.
    assert links == [
        "https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/",
        "https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/",
    ]
