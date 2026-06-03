"""Tests for recency-weighted consensus scoring."""

from datetime import date, timedelta

from scorer.consensus import score_consensus

TODAY = date(2026, 6, 2)


def _report(sentiment: str | None, days_old: int = 0) -> dict:
    return {
        "sentiment": sentiment,
        "report_date": TODAY - timedelta(days=days_old),
    }


def test_fewer_than_two_reports_returns_none():
    assert score_consensus([], TODAY) is None
    assert score_consensus([_report("excellent")], TODAY) is None


def test_perfect_agreement_scores_high():
    reports = [_report("excellent"), _report("excellent"), _report("excellent")]
    score = score_consensus(reports, TODAY)
    assert score >= 10.0


def test_disagreement_scores_lower_than_agreement():
    agree = score_consensus([_report("excellent"), _report("excellent")], TODAY)
    disagree = score_consensus([_report("excellent"), _report("off")], TODAY)
    assert disagree < agree


def test_stale_disagreement_matters_less_than_fresh():
    """An old conflicting report drags consensus down less than a fresh one."""
    fresh_conflict = score_consensus([_report("excellent", 0), _report("excellent", 0), _report("poor", 0)], TODAY)
    stale_conflict = score_consensus([_report("excellent", 0), _report("excellent", 0), _report("poor", 18)], TODAY)
    assert stale_conflict > fresh_conflict


def test_more_reports_corroboration_bonus():
    """With agreement below the cap, more rated reports earn a corroboration bonus."""
    # Mixed good/excellent leaves headroom below the 10.0 cap
    two = score_consensus([_report("good"), _report("excellent")], TODAY)
    four = score_consensus([_report("good"), _report("excellent"), _report("good"), _report("excellent")], TODAY)
    assert four > two
