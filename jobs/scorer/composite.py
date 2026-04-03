"""Compute weighted composite signal from sub-scores."""

# Weights for each component
WEIGHTS = {
    "flow": 0.35,
    "sentiment": 0.45,
    "consensus": 0.20,
}


def compute_composite(
    flow_score: float | None,
    sentiment_score: float | None,
    consensus_score: float | None,
) -> float:
    """Weighted average of available sub-scores.

    If a sub-score is missing, its weight is redistributed proportionally.
    """
    scores = {}
    if flow_score is not None:
        scores["flow"] = flow_score
    if sentiment_score is not None:
        scores["sentiment"] = sentiment_score
    if consensus_score is not None:
        scores["consensus"] = consensus_score

    if not scores:
        return 5.0  # Default neutral score

    total_weight = sum(WEIGHTS[k] for k in scores)
    weighted_sum = sum(scores[k] * WEIGHTS[k] for k in scores)

    return round(weighted_sum / total_weight, 1)
