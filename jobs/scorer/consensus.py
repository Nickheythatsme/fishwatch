"""Score multi-source agreement for a water body."""

from __future__ import annotations

from datetime import date

from .sentiment_score import SENTIMENT_VALUES, report_weight


def score_consensus(reports: list[dict], today: date | None = None) -> float | None:
    """Score how much sources agree with each other (0-10).

    High consensus = multiple sources reporting similar sentiment.
    Low consensus = conflicting reports or only one source.

    Reports are recency-weighted (see sentiment_score.report_weight), so a
    fresh disagreement lowers consensus more than a stale one.
    """
    if today is None:
        today = date.today()

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

    # Bonus for having more sources (up to 1 point for 4+ sources)
    source_bonus = min(1.0, (len(weighted) - 1) * 0.33)

    return round(min(10.0, agreement + source_bonus), 1)
