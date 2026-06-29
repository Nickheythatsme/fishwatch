"""Tests for the forum engagement-refresh decision logic (pure helpers)."""

from scraper.refresh_engagement import (
    classify_posts,
    is_systemic_failure,
    thread_url_from_source_url,
)

_THREAD = "https://pnwflyfishing.com/forum/index.php?threads/upper-deschutes-report.11402"


def _record(post_id: str, reactions: int, **meta) -> dict:
    return {
        "content": f"report {post_id}",
        "source_url": f"{_THREAD}/post-{post_id}",
        "metadata": {"post_id": post_id, "reactions": reactions, **meta},
    }


def test_thread_url_strips_post_anchor():
    assert thread_url_from_source_url(f"{_THREAD}/post-250302") == _THREAD
    assert thread_url_from_source_url(f"{_THREAD}/post-250302/") == _THREAD
    # A bare thread URL (no anchor) is returned unchanged.
    assert thread_url_from_source_url(_THREAD) == _THREAD


def test_classify_changed_known_post_is_an_update():
    known = {"100": 5}
    updates, inserts = classify_posts(known, [_record("100", 9)])
    assert [r["metadata"]["post_id"] for r in updates] == ["100"]
    assert inserts == []


def test_classify_unchanged_known_post_is_noop():
    known = {"100": 5}
    updates, inserts = classify_posts(known, [_record("100", 5)])
    assert updates == []
    assert inserts == []


def test_classify_unknown_post_is_an_insert():
    known = {"100": 5}
    updates, inserts = classify_posts(known, [_record("200", 7)])
    assert updates == []
    assert [r["metadata"]["post_id"] for r in inserts] == ["200"]


def test_classify_mixed_batch():
    known = {"100": 5, "101": 10}
    records = [
        _record("100", 12),  # changed -> update
        _record("101", 10),  # unchanged -> noop
        _record("202", 4),  # new -> insert
    ]
    updates, inserts = classify_posts(known, records)
    assert [r["metadata"]["post_id"] for r in updates] == ["100"]
    assert [r["metadata"]["post_id"] for r in inserts] == ["202"]


def test_classify_ignores_records_without_post_id():
    # The body-fallback record (no post_id) must never become an insert.
    fallback = {"content": "body text", "source_url": _THREAD, "metadata": {}}
    updates, inserts = classify_posts({}, [fallback])
    assert updates == []
    assert inserts == []


def test_systemic_failure_none_when_nothing_failed():
    assert is_systemic_failure(6, 0) is False


def test_systemic_failure_none_when_no_threads():
    assert is_systemic_failure(0, 0) is False


def test_systemic_failure_minority_is_contained():
    # A few transient errors out of many threads stay non-blocking.
    assert is_systemic_failure(6, 1) is False
    assert is_systemic_failure(10, 4) is False


def test_systemic_failure_majority_blocks():
    assert is_systemic_failure(6, 3) is True
    assert is_systemic_failure(10, 8) is True


def test_systemic_failure_all_failed_blocks():
    assert is_systemic_failure(6, 6) is True
    assert is_systemic_failure(1, 1) is True
