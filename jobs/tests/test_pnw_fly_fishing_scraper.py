"""Tests for the PNW Fly Fishing forum scraper: RSS thread discovery and the
OP-plus-high-engagement-replies record extraction."""

import asyncio
from unittest.mock import AsyncMock

from scraper.sources import pnw_fly_fishing
from scraper.sources.pnw_fly_fishing import REPLY_MIN_REACTIONS, PNWFlyFishingScraper

# XenForo subforum RSS: channel <link> (ignored) + thread <item>s, one duplicated.
_SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <link>https://pnwflyfishing.com/forum/</link>
    <item><link>https://pnwflyfishing.com/forum/index.php?threads/upper-deschutes-report.11402/</link></item>
    <item><link>https://pnwflyfishing.com/forum/index.php?threads/upper-deschutes-report.11402/</link></item>
    <item><link>https://pnwflyfishing.com/forum/index.php?threads/metolius-report.11500/</link></item>
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


def test_discovers_thread_urls_from_rss_and_dedupes(monkeypatch):
    scraper = PNWFlyFishingScraper()
    fake_client = _FakeAsyncClient(_SAMPLE_RSS)
    monkeypatch.setattr(pnw_fly_fishing.httpx, "AsyncClient", lambda *a, **k: fake_client)

    links = asyncio.run(scraper.discover_posts(AsyncMock()))

    assert fake_client.requested_url == pnw_fly_fishing._RSS_URL
    # Browser-like headers so the WAF serves the feed (mirrors caddis_fly).
    assert fake_client.requested_headers == pnw_fly_fishing._RSS_HEADERS
    assert "Mozilla/5.0" in fake_client.requested_headers["User-Agent"]
    # Channel <link> excluded, duplicate collapsed, order preserved.
    assert links == [
        "https://pnwflyfishing.com/forum/index.php?threads/upper-deschutes-report.11402/",
        "https://pnwflyfishing.com/forum/index.php?threads/metolius-report.11500/",
    ]


def _page_returning(posts: list[dict]) -> AsyncMock:
    page = AsyncMock()
    page.evaluate = AsyncMock(return_value=posts)
    return page


_THREAD_URL = "https://pnwflyfishing.com/forum/index.php?threads/upper-deschutes-report.11402/"


def test_op_always_kept_and_replies_gated_by_reactions():
    scraper = PNWFlyFishingScraper()
    posts = [
        {
            "postId": "250302",
            "isOp": True,
            "author": "Oliver",
            "datetime": "2025-07-28T23:03:12-0700",
            "reactions": 20,
            "content": "Upper Deschutes has been excellent, dry-dropper worked.",
        },
        # Low-engagement banter reply — dropped.
        {
            "postId": "250303",
            "isOp": False,
            "author": "Robert",
            "datetime": "2025-07-29T09:47:16-0700",
            "reactions": 0,
            "content": "The skeeters were horrible.",
        },
        # High-engagement reply — kept.
        {
            "postId": "250320",
            "isOp": False,
            "author": "Vagabond",
            "datetime": "2025-07-30T03:45:23-0700",
            "reactions": REPLY_MIN_REACTIONS + 4,
            "content": "Brookies on streamers up high are a blast.",
        },
        # Exactly at the threshold — kept.
        {
            "postId": "250321",
            "isOp": False,
            "author": "Kado",
            "datetime": "2025-07-31T03:45:23-0700",
            "reactions": REPLY_MIN_REACTIONS,
            "content": "Caddis came off in the evening.",
        },
        # Just below threshold — dropped.
        {
            "postId": "250322",
            "isOp": False,
            "author": "Zak",
            "datetime": "2025-08-01T03:45:23-0700",
            "reactions": REPLY_MIN_REACTIONS - 1,
            "content": "Nice, thanks for the report.",
        },
    ]
    records = asyncio.run(scraper.extract_records(_page_returning(posts), _THREAD_URL))

    kept_ids = [r["metadata"]["post_id"] for r in records]
    assert kept_ids == ["250302", "250320", "250321"]

    op = records[0]
    assert op["metadata"]["post_type"] == "op"
    assert op["metadata"]["reactions"] == 20
    assert op["metadata"]["replies"] == 4  # 5 posts -> 4 replies
    assert op["metadata"]["author"] == "Oliver"
    # Per-post permalink anchor.
    assert op["source_url"] == _THREAD_URL.rstrip("/") + "/post-250302"
    assert all(r["metadata"]["post_type"] == "reply" for r in records[1:])


def test_op_kept_even_with_zero_reactions():
    """A fresh report with no reactions yet is still the report — keep it."""
    scraper = PNWFlyFishingScraper()
    posts = [
        {
            "postId": "9001",
            "isOp": True,
            "author": "Newbie",
            "datetime": "2026-06-20T08:00:00-0700",
            "reactions": 0,
            "content": "Fished the Metolius today, tough but landed a few on Pale Morning Duns.",
        },
    ]
    records = asyncio.run(scraper.extract_records(_page_returning(posts), _THREAD_URL))
    assert len(records) == 1
    assert records[0]["metadata"]["post_type"] == "op"
    assert records[0]["metadata"]["reactions"] == 0


def test_each_record_carries_its_own_post_html():
    """Each record must store its own post HTML, not the whole-thread HTML.

    Otherwise the extractor's select_one('.message-body .bbWrapper') would always
    re-extract the first post (the OP), duplicating the OP's text under every
    reply's engagement/source_post_id.
    """
    scraper = PNWFlyFishingScraper()
    posts = [
        {
            "postId": "100",
            "isOp": True,
            "author": "Op",
            "datetime": None,
            "reactions": 5,
            "content": "OP report text.",
            "html": "<article data-content='post-100'>OP body</article>",
        },
        {
            "postId": "200",
            "isOp": False,
            "author": "Replier",
            "datetime": None,
            "reactions": 9,
            "content": "Reply report text.",
            "html": "<article data-content='post-200'>Reply body</article>",
        },
    ]
    records = asyncio.run(scraper.extract_records(_page_returning(posts), _THREAD_URL))
    assert [r["raw_html"] for r in records] == [
        "<article data-content='post-100'>OP body</article>",
        "<article data-content='post-200'>Reply body</article>",
    ]


def test_empty_content_posts_are_skipped():
    scraper = PNWFlyFishingScraper()
    posts = [
        {"postId": "1", "isOp": True, "author": "A", "datetime": None, "reactions": 5, "content": "   "},
        {"postId": "2", "isOp": False, "author": "B", "datetime": None, "reactions": 10, "content": "Real text."},
    ]
    records = asyncio.run(scraper.extract_records(_page_returning(posts), _THREAD_URL))
    assert [r["metadata"]["post_id"] for r in records] == ["2"]


def test_no_posts_falls_back_to_body():
    """A layout change (no article.message) degrades to body text, not silence."""
    scraper = PNWFlyFishingScraper()
    page = _page_returning([])
    page._query_content = AsyncMock(return_value=("fallback body text", True))
    # Bind the real method's behavior: extract_records calls self._query_content.
    records = asyncio.run(_run_with_fallback(scraper, page))
    assert records == [{"content": "fallback body text", "source_url": _THREAD_URL, "metadata": {}}]
    assert scraper._body_fallback_used is True


async def _run_with_fallback(scraper: PNWFlyFishingScraper, page: AsyncMock) -> list[dict]:
    # _query_content is a coroutine on the real scraper; patch it on the instance.
    scraper._query_content = page._query_content
    return await scraper.extract_records(page, _THREAD_URL)
