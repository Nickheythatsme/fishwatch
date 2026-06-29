"""Tests for recency-weighted sentiment scoring."""

from datetime import date, timedelta

from scorer.sentiment_score import (
    NEUTRAL_PRIOR_WEIGHT,
    NEUTRAL_SCORE,
    RECENCY_DECAY,
    SOURCE_WEIGHTS,
    engagement_factor,
    report_weight,
    score_sentiment,
)

TODAY = date(2026, 6, 2)


def _report(sentiment: str | None, days_old: int | None = 0) -> dict:
    return {
        "sentiment": sentiment,
        "report_date": TODAY - timedelta(days=days_old) if days_old is not None else None,
    }


def test_no_reports_returns_none():
    assert score_sentiment([], TODAY) is None


def test_reports_without_sentiment_return_none():
    assert score_sentiment([_report(None), _report("unknown-value")], TODAY) is None


def test_fresh_report_blended_with_neutral_prior():
    """A single fresh excellent report scores high but not a perfect 10."""
    # (10*1.0 + 5*0.5) / 1.5 = 8.3
    assert score_sentiment([_report("excellent", 0)], TODAY) == 8.3


def test_score_fades_as_report_ages():
    """The same report scores progressively lower as it ages."""
    fresh = score_sentiment([_report("excellent", 0)], TODAY)
    week_old = score_sentiment([_report("excellent", 7)], TODAY)
    two_weeks_old = score_sentiment([_report("excellent", 14)], TODAY)
    three_weeks_old = score_sentiment([_report("excellent", 21)], TODAY)

    assert fresh > week_old > two_weeks_old > three_weeks_old
    # By three weeks the score has nearly faded to neutral
    assert abs(three_weeks_old - NEUTRAL_SCORE) < 0.5


def test_recent_reports_outweigh_old_ones():
    """A fresh poor report pulls the score down more than an old excellent one holds it up."""
    reports = [_report("excellent", 14), _report("poor", 0)]
    score = score_sentiment(reports, TODAY)
    assert score < 5.0  # Dominated by the fresh poor report


def test_multiple_fresh_reports_overcome_prior():
    """Many fresh excellent reports converge toward 10."""
    reports = [_report("excellent", 0) for _ in range(5)]
    # (50 + 2.5) / 5.5 = 9.5
    assert score_sentiment(reports, TODAY) == 9.5


def test_missing_report_date_uses_default_age():
    """Reports with no date get a conservative default age, not full weight."""
    no_date = score_sentiment([_report("excellent", None)], TODAY)
    fresh = score_sentiment([_report("excellent", 0)], TODAY)
    assert no_date < fresh


def test_report_weight_decay():
    assert report_weight(_report("good", 0), TODAY) == 1.0
    assert report_weight(_report("good", 7), TODAY) == RECENCY_DECAY**7


def test_future_dated_report_clamped_to_full_weight():
    """A future-dated report (bad data) is treated as fresh, not weighted > 1."""
    future = {"sentiment": "excellent", "report_date": TODAY + timedelta(days=4)}
    assert report_weight(future, TODAY) == 1.0


def test_neutral_prior_constants_sane():
    assert NEUTRAL_SCORE == 5.0
    assert 0 < NEUTRAL_PRIOR_WEIGHT < 1


# ── Source-trust + engagement weighting ─────────────────────────────────────


def test_unknown_source_keeps_default_weight():
    """A report from a non-forum source (no engagement) is unscaled."""
    fresh = _report("good", 0)
    fresh["source_name"] = "confluence_fly_shop"
    assert report_weight(fresh, TODAY) == 1.0


def test_forum_source_is_down_weighted_below_shop():
    """A forum report never outweighs an equivalent professional-shop report."""
    shop = {**_report("good", 0), "source_name": "confluence_fly_shop"}
    forum = {**_report("good", 0), "source_name": "pnw_fly_fishing", "engagement": 25}
    # Even a highly-reacted, perfectly fresh forum post tops out at the source cap.
    assert report_weight(forum, TODAY) < report_weight(shop, TODAY)
    assert report_weight(forum, TODAY) == SOURCE_WEIGHTS["pnw_fly_fishing"]


def test_higher_engagement_weighs_more_within_forum():
    """Among forum posts, more reactions => more influence (up to the cap)."""
    low = {**_report("good", 0), "source_name": "pnw_fly_fishing", "engagement": 0}
    high = {**_report("good", 0), "source_name": "pnw_fly_fishing", "engagement": 20}
    assert report_weight(high, TODAY) > report_weight(low, TODAY)


def test_engagement_factor_bounds():
    """engagement_factor stays within [0.6, 1.0]; None (no signal) is unscaled."""
    assert engagement_factor({"engagement": None}) == 1.0
    assert engagement_factor({"engagement": 0}) == 0.6
    assert engagement_factor({"engagement": 1000}) == 1.0  # saturates at the cap
    assert engagement_factor({"engagement": -5}) == 0.6  # negative clamped


def test_forum_sentiment_pulled_toward_neutral_by_low_weight():
    """A lone forum 'excellent' moves the score less than a shop 'excellent'."""
    shop = score_sentiment([{**_report("excellent", 0), "source_name": "confluence_fly_shop"}], TODAY)
    forum = score_sentiment([{**_report("excellent", 0), "source_name": "pnw_fly_fishing", "engagement": 5}], TODAY)
    assert NEUTRAL_SCORE < forum < shop
