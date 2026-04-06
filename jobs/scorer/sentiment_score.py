"""Aggregate sentiment from parsed reports into a numeric score."""

from __future__ import annotations

SENTIMENT_VALUES = {
    "excellent": 10.0,
    "good": 7.5,
    "fair": 5.0,
    "poor": 2.5,
    "off": 0.0,
}


def score_sentiment(reports: list[dict]) -> float | None:
    """Average sentiment score from recent parsed reports.

    Returns None if no reports have sentiment data.
    """
    scores = []
    for r in reports:
        sentiment = r.get("sentiment")
        if sentiment and sentiment in SENTIMENT_VALUES:
            scores.append(SENTIMENT_VALUES[sentiment])

    if not scores:
        return None

    return round(sum(scores) / len(scores), 1)
