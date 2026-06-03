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


def report_weight(report: dict, today: date) -> float:
    """Recency weight for a report: RECENCY_DECAY ** days_old."""
    report_date = report.get("report_date")
    if report_date is None:
        days_old = DEFAULT_AGE_DAYS
    else:
        days_old = max((today - report_date).days, 0)
    return RECENCY_DECAY**days_old


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
