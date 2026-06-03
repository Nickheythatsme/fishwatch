"""Score agreement across reports for a water body."""

from __future__ import annotations

from datetime import UTC, date, datetime

from .sentiment_score import SENTIMENT_VALUES, report_weight


def score_consensus(reports: list[dict], today: date | None = None) -> float | None:
    """Score how much recent reports agree with each other (0-10).

    High consensus = multiple reports with similar sentiment.
    Low consensus = conflicting reports, or fewer than two rated reports.

    Reports are recency-weighted (see sentiment_score.report_weight), so a
    fresh disagreement lowers consensus more than a stale one.

    Note: agreement is measured across individual rated reports, not distinct
    sources. After dedup each (source, date) is a single report, but one source
    can still contribute several reports across the lookback window.
    """
    if today is None:
        today = datetime.now(UTC).date()

    weighted: list[tuple[float, float]] = []
    for r in reports:
        s = r.get("sentiment")
        if s and s in SENTIMENT_VALUES:
            weighted.append((SENTIMENT_VALUES[s], report_weight(r, today)))

    if len(weighted) < 2:
        return None

    # Weighted standard deviation as a measure of disagreement
    total_weight = sum(w for _, w in weighted)
    mean = sum(v * w for v, w in weighted) / total_weight
    variance = sum(w * (v - mean) ** 2 for v, w in weighted) / total_weight
    std_dev = variance**0.5

    # Max possible std_dev with our scale is 5 (all extremes)
    # Convert to 0-10 where 10 = perfect agreement
    agreement = max(0.0, 10.0 - (std_dev * 2))

    # Bonus for corroboration: more rated reports => more confidence in the
    # agreement (up to 1 point at 4+ reports)
    corroboration_bonus = min(1.0, (len(weighted) - 1) * 0.33)

    return round(min(10.0, agreement + corroboration_bonus), 1)
