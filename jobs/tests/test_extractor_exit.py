"""Tests for the extract job's fatal-vs-soft exit-code semantics (#104)."""

from extractor.main import _should_fail


def test_partial_failure_with_some_success_is_soft():
    # 1 of 2 reports failed but 4 entries were created -> exit 0 so `score` runs.
    assert _should_fail(total_extracted=4, failures=1, reports_count=2, fatal=False) is False


def test_all_success_is_soft():
    assert _should_fail(total_extracted=4, failures=0, reports_count=2, fatal=False) is False


def test_total_wipeout_is_fatal():
    # Reports existed, none extracted, and there were failures -> fail.
    assert _should_fail(total_extracted=0, failures=2, reports_count=2, fatal=False) is True


def test_nothing_to_process_is_soft():
    # No unprocessed reports / nothing extracted but no failures -> exit 0.
    assert _should_fail(total_extracted=0, failures=0, reports_count=0, fatal=False) is False


def test_fatal_flag_always_fails():
    # Systemic failure (e.g. DB unreachable) overrides everything.
    assert _should_fail(total_extracted=4, failures=0, reports_count=2, fatal=True) is True
