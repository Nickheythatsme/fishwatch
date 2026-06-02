"""Compute weighted composite signal from sub-scores."""

from __future__ import annotations

# Weights for each component
WEIGHTS = {
    "flow": 0.35,
    "sentiment": 0.45,
    "consensus": 0.20,
}

# Disagreement guard thresholds: when flow scores at or below FLOW_SUSPECT_MAX
# while sentiment is at or above SENTIMENT_TRUSTED_MIN, the gauge data is
# treated as suspect and flow should be excluded from the signal.
FLOW_SUSPECT_MAX = 2.0
SENTIMENT_TRUSTED_MIN = 7.0

# Cap for composites built from flow alone. Favorable flows with no report
# evidence shouldn't read as "excellent" — no one has confirmed the fishing.
FLOW_ONLY_CAP = 7.0


def is_flow_only(
    flow_score: float | None,
    sentiment_score: float | None,
    consensus_score: float | None,
) -> bool:
    """Whether the signal would be built from flow alone, with no report evidence.

    The caller (scorer.main) should cap such composites at FLOW_ONLY_CAP.
    """
    return flow_score is not None and sentiment_score is None and consensus_score is None


def is_flow_suspect(flow_score: float | None, sentiment_score: float | None) -> bool:
    """Whether the flow score contradicts shop reports badly enough to distrust it.

    If flow looks unfishable while recent shop reports are strong, the gauge
    data is almost certainly wrong (mis-mapped station, bad reading) rather
    than the river being blown out — people on the water are ground truth.

    The caller (scorer.main) is responsible for excluding flow from both the
    composite and persistence when this returns True.
    """
    return (
        flow_score is not None
        and sentiment_score is not None
        and flow_score <= FLOW_SUSPECT_MAX
        and sentiment_score >= SENTIMENT_TRUSTED_MIN
    )


def compute_composite(
    flow_score: float | None,
    sentiment_score: float | None,
    consensus_score: float | None,
) -> float:
    """Weighted average of available sub-scores.

    If a sub-score is missing, its weight is redistributed proportionally.
    Pure arithmetic — disagreement-guard filtering happens in the caller.
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
