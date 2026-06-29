"""Scraper for the PNW Fly Fishing community forum (pnwflyfishing.com).

XenForo forum. Unlike the fly-shop sources, this is user-generated content of
uneven quality, so we do not take every post at face value:

- Discovery uses the "Trip Reports" subforum RSS feed (same bot-detection-proof
  pattern as caddis_fly) to find thread URLs.
- Each thread page yields multiple records: the original post (always — it is the
  report) plus any replies whose reaction ("thumbs up") count clears
  REPLY_MIN_REACTIONS. Low-engagement banter replies are dropped at scrape time.
- Every record carries its reaction count in metadata so the scorer can weight
  forum reports below professional shops and let engagement modulate influence.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

import httpx
from playwright.async_api import Page

from .base import BaseScraper

_SUBFORUM_URL = "https://pnwflyfishing.com/forum/index.php?forums/trip-reports.4/"
_RSS_URL = "https://pnwflyfishing.com/forum/index.php?forums/trip-reports.4/index.rss"

# Lenient readiness selector so the base index goto doesn't hard-fail; discovery
# happens over RSS, not this page.
_INDEX_READY_SELECTOR = ".p-body, #content, body"

# Browser-like headers so the forum's WAF serves the RSS document instead of
# bouncing a bare python-httpx request (mirrors caddis_fly, issue #133).
_RSS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8",
}

# Minimum reactions a *reply* needs to be ingested. The original post is always
# ingested regardless (it is the report); replies must earn their way in.
REPLY_MIN_REACTIONS = 3

# Per-post extraction runs in the page so we can read reaction counts, post ids,
# authors and dates in one pass. Returns the posts in thread order; the first is
# treated as the original post (OP).
_POSTS_JS = r"""
() => {
  const parseReactions = (post) => {
    const link = post.querySelector('.reactionsBar-link');
    if (!link) return 0;
    const txt = link.innerText || '';
    let count = 0;
    let namesPart = txt;
    // "... and N others" — the bulk of the reactors beyond the few named ones.
    const m = txt.match(/\band (\d+) others?\b/);
    if (m) { count += parseInt(m[1], 10); namesPart = txt.slice(0, m.index); }
    // Remaining are explicitly named reactors, separated by commas and "and".
    const names = namesPart.split(/,|\band\b/).map(s => s.trim()).filter(Boolean);
    return count + names.length;
  };

  const extractPost = (post) => {
    // Clone the whole post and drop quoted blocks so a reply that quotes another
    // post is not re-extracted as that post's content (the OP's text would
    // otherwise leak into every reply's report). The cleaned per-post HTML is
    // what the extractor re-parses, so each raw_report isolates its own post.
    const clone = post.cloneNode(true);
    clone.querySelectorAll('.bbCodeBlock--quote, blockquote').forEach(q => q.remove());
    const bodyEl = clone.querySelector('.message-body .bbWrapper');
    return {
      content: bodyEl ? (bodyEl.innerText || '').trim() : '',
      html: clone.outerHTML,
    };
  };

  const posts = Array.from(document.querySelectorAll('article.message'));
  return posts.map((post, i) => {
    const dc = post.getAttribute('data-content') || '';            // "post-250302"
    const postId = dc.startsWith('post-') ? dc.slice(5) : dc;
    const timeEl = post.querySelector('time.u-dt');
    const { content, html } = extractPost(post);
    return {
      postId,
      isOp: i === 0,
      author: post.getAttribute('data-author') || null,
      datetime: timeEl ? timeEl.getAttribute('datetime') : null,
      reactions: parseReactions(post),
      content,
      html,
    };
  });
}
"""


class PNWFlyFishingScraper(BaseScraper):
    """Scraper for the PNW Fly Fishing 'Trip Reports' subforum."""

    index_ready_selector = _INDEX_READY_SELECTOR
    index_ready_state = "attached"

    def __init__(self):
        super().__init__(name="pnw_fly_fishing", url=_SUBFORUM_URL)

    async def discover_posts(self, page: Page) -> list[str]:
        """Discover thread URLs from the subforum RSS feed (bot-detection-proof)."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(_RSS_URL, timeout=30, headers=_RSS_HEADERS)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
        # Only <item> links are threads; the channel-level <link> is excluded by iter("item").
        links = [link for item in root.iter("item") if (link := item.findtext("link"))]
        return list(dict.fromkeys(links))

    async def extract_records(self, page: Page, url: str) -> list[dict]:
        """Emit the original post plus high-engagement replies as separate records."""
        posts = await page.evaluate(_POSTS_JS)
        if not posts:
            # Fall back to body text so a layout change degrades rather than silently
            # dropping the thread; flag the fallback for the health status.
            text, self._body_fallback_used = await self._query_content(page, ".message-body .bbWrapper")
            return [{"content": text, "source_url": url, "metadata": {}}]

        reply_count = max(0, len(posts) - 1)
        records: list[dict] = []
        for post in posts:
            content = (post.get("content") or "").strip()
            reactions = int(post.get("reactions") or 0)
            is_op = bool(post.get("isOp"))
            if not content:
                continue
            # The OP is always kept; replies must clear the engagement bar.
            if not is_op and reactions < REPLY_MIN_REACTIONS:
                continue

            post_id = post.get("postId") or ""
            post_url = f"{url.rstrip('/')}/post-{post_id}" if post_id else url
            record = {
                "content": content,
                "source_url": post_url,
            }
            # Store this post's own HTML (quotes stripped) so the extractor
            # re-parses the right post rather than the whole thread's first post.
            post_html = post.get("html")
            if post_html:
                record["raw_html"] = post_html
            records.append(
                {
                    **record,
                    "metadata": {
                        "reactions": reactions,
                        "replies": reply_count,
                        "post_type": "op" if is_op else "reply",
                        "post_id": post_id,
                        "author": post.get("author"),
                        "posted_at": post.get("datetime"),
                    },
                }
            )
        return records
