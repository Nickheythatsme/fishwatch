"""Score multi-source agreement for a water body."""

from .sentiment_score import SENTIMENT_VALUES


def score_consensus(reports: list[dict]) -> float | None:
    """Score how much sources agree with each other (0-10).

    High consensus = multiple sources reporting similar sentiment.
    Low consensus = conflicting reports or only one source.
    """
    sentiments = []
    for r in reports:
        s = r.get("sentiment")
        if s and s in SENTIMENT_VALUES:
            sentiments.append(SENTIMENT_VALUES[s])

    if len(sentiments) < 2:
        return None

    # Standard deviation as a measure of disagreement
    mean = sum(sentiments) / len(sentiments)
    variance = sum((s - mean) ** 2 for s in sentiments) / len(sentiments)
    std_dev = variance**0.5

    # Max possible std_dev with our scale is 5 (all extremes)
    # Convert to 0-10 where 10 = perfect agreement
    agreement = max(0.0, 10.0 - (std_dev * 2))

    # Bonus for having more sources (up to 1 point for 4+ sources)
    source_bonus = min(1.0, (len(sentiments) - 1) * 0.33)

    return round(min(10.0, agreement + source_bonus), 1)
