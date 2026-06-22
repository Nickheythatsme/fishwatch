"""Tests for the Caddis Fly scraper's index readiness handling."""

import asyncio
from unittest.mock import AsyncMock

from scraper.sources.caddis_fly import _INDEX_LINK_SELECTOR, CaddisFlyScraper


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


def test_caddis_fly_discovers_links_from_multiple_title_patterns_and_filters_travel_posts():
    scraper = CaddisFlyScraper()
    page = AsyncMock()
    page.eval_on_selector_all.return_value = [
        "https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/",
        "https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/",
        "https://oregonflyfishingblog.com/2026/06/01/alaska-lodge-update/",
        "https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/",
    ]

    links = asyncio.run(scraper.discover_posts(page))

    page.eval_on_selector_all.assert_awaited_once_with(
        _INDEX_LINK_SELECTOR,
        "els => els.map(el => el.href)",
    )
    assert links == [
        "https://oregonflyfishingblog.com/2026/06/06/lower-deschutes-report/",
        "https://oregonflyfishingblog.com/2026/05/30/mckenzie-river-report/",
    ]
