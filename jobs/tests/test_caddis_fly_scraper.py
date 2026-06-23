"""Tests for the Caddis Fly scraper's RSS-based post discovery."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from scraper.sources.caddis_fly import CaddisFlyScraper

_SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fishing Reports</title>
    <item>
      <title>Lower Deschutes Report</title>
      <link>https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/</link>
    </item>
    <item>
      <title>Lower Deschutes Report (duplicate)</title>
      <link>https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/</link>
    </item>
    <item>
      <title>Alaska Lodge Update</title>
      <link>https://oregonflyfishingblog.com/2026/06/01/alaska-lodge-update/</link>
    </item>
    <item>
      <title>McKenzie River Report</title>
      <link>https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/</link>
    </item>
  </channel>
</rss>"""


def _make_mock_httpx_client(rss_text: str) -> MagicMock:
    mock_response = MagicMock()
    mock_response.text = rss_text
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


def test_caddis_fly_waits_for_attached_index_ready_selector():
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


def test_caddis_fly_discovers_links_from_rss_and_filters_travel_posts():
    scraper = CaddisFlyScraper()
    page = AsyncMock()
    mock_client = _make_mock_httpx_client(_SAMPLE_RSS)

    with patch("scraper.sources.caddis_fly.httpx.AsyncClient", return_value=mock_client):
        links = asyncio.run(scraper.discover_posts(page))

    assert links == [
        "https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/",
        "https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/",
    ]
