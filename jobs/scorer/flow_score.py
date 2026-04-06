"""Score flow conditions vs ideal range for each water body."""

from __future__ import annotations

from scraper.config import IDEAL_FLOW_RANGES


def score_flow(slug: str, current_flow: float | None) -> float | None:
    """Score flow on 0-10 scale based on how close it is to ideal range.

    Returns 10 when flow is within the ideal range, tapering to 0 as
    it diverges further from the range.
    """
    if current_flow is None:
        return None

    ideal = IDEAL_FLOW_RANGES.get(slug)
    if not ideal:
        return None

    low, high = ideal
    mid = (low + high) / 2
    range_width = high - low

    if low <= current_flow <= high:
        return 10.0

    # How far outside the range (as a fraction of the range width)
    if current_flow < low:
        deviation = (low - current_flow) / range_width
    else:
        deviation = (current_flow - high) / range_width

    # Exponential decay — score drops to ~5 at 0.5x range width deviation
    score = 10.0 * (0.5 ** deviation)
    return round(max(0.0, min(10.0, score)), 1)
