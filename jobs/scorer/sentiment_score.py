"""Aggregate sentiment from parsed reports into a numeric score."""

from __future__ import annotations

from datetime import UTC, date, datetime

SENTIMENT_VALUES = {
    "excellent": 10.0,
    "good": 7.5,
    "fair": 5.0,
    "poor": 2.5,
    "off": 0.0,
}

# Recency decay: a report's weight is RECENCY_DECAY ** days_old (same decay
# factor as fly_ranking). Weight ~0.3 at one week, ~0.1 at two weeks, ~0.03
# at three weeks.
RECENCY_DECAY = 0.85

# Age assumed for reports missing a report_date
DEFAULT_AGE_DAYS = 7

# Neutral prior blended into the weighted average so the score fades toward
# neutral as reports age, instead of a single stale report holding the score
# at its full value until it leaves the lookback window.
NEUTRAL_SCORE = 5.0
NEUTRAL_PRIOR_WEIGHT = 0.5

# Per-source trust multiplier. Professional fly-shop and agency reports are the
# baseline (1.0). Community-forum reports are user-generated and uneven, so they
# count for less. Combined with engagement_factor() below, a forum report never
# outweighs a shop report (max 0.5 * 1.0 = 0.5).
DEFAULT_SOURCE_WEIGHT = 1.0
SOURCE_WEIGHTS = {
    "pnw_fly_fishing": 0.5,
}


def engagement_factor(report: dict) -> float:
    """Crowd-engagement multiplier in [0.6, 1.0] for sources that carry one.

    Sources without an engagement signal (engagement is None — shops/agencies)
    are unscaled (1.0). For forum posts, more reactions ("thumbs up") => more
    trust, saturating at 1.0 once a post clears ~8 reactions.
    """
    engagement = report.get("engagement")
    if engagement is None:
        return 1.0
    return min(1.0, 0.6 + 0.05 * max(engagement, 0))


def report_weight(report: dict, today: date) -> float:
    """Combined per-report weight: recency * source trust * engagement.

    Both score_sentiment and score_consensus route through this, so source and
    engagement weighting apply consistently across signals.
    """
    report_date = report.get("report_date")
    if report_date is None:
        days_old = DEFAULT_AGE_DAYS
    else:
        days_old = max((today - report_date).days, 0)
    recency = RECENCY_DECAY**days_old
    source_weight = SOURCE_WEIGHTS.get(report.get("source_name"), DEFAULT_SOURCE_WEIGHT)
    return recency * source_weight * engagement_factor(report)


def score_sentiment(reports: list[dict], today: date | None = None) -> float | None:
    """Recency-weighted average sentiment from parsed reports.

    Recent reports count more than old ones, and the average is blended with
    a neutral prior (NEUTRAL_SCORE) so the score gradually fades toward
    neutral as reports age rather than cliff-dropping when the last report
    leaves the lookback window.

    Returns None if no reports have sentiment data.
    """
    if today is None:
        today = datetime.now(UTC).date()

    weighted_sum = 0.0
    total_weight = 0.0
    for r in reports:
        sentiment = r.get("sentiment")
        if sentiment and sentiment in SENTIMENT_VALUES:
            weight = report_weight(r, today)
            weighted_sum += SENTIMENT_VALUES[sentiment] * weight
            total_weight += weight

    if total_weight == 0.0:
        return None

    weighted_sum += NEUTRAL_SCORE * NEUTRAL_PRIOR_WEIGHT
    total_weight += NEUTRAL_PRIOR_WEIGHT

    return round(weighted_sum / total_weight, 1)
