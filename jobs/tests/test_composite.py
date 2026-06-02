"""Tests for composite signal computation and the disagreement guard."""

from scorer.composite import FLOW_ONLY_CAP, compute_composite, is_flow_only, is_flow_suspect


def test_is_flow_only():
    """Flow-only means flow exists but there is zero report evidence."""
    assert is_flow_only(10.0, None, None) is True
    assert is_flow_only(10.0, 8.0, None) is False  # Has sentiment
    assert is_flow_only(10.0, None, 8.0) is False  # Has consensus
    assert is_flow_only(None, None, None) is False  # No flow either


def test_flow_only_cap_applies():
    """Caller pattern (scorer.main): a flow-only composite is capped."""
    f_score, s_score, c_score = 10.0, None, None
    composite = compute_composite(f_score, s_score, c_score)
    assert composite == 10.0  # Pure arithmetic gives full flow score
    if is_flow_only(f_score, s_score, c_score):
        composite = min(composite, FLOW_ONLY_CAP)
    assert composite == FLOW_ONLY_CAP


def test_all_scores_present():
    """Weighted average of all three sub-scores."""
    # 8.0*0.35 + 6.0*0.45 + 4.0*0.20 = 2.8 + 2.7 + 0.8 = 6.3
    assert compute_composite(8.0, 6.0, 4.0) == 6.3


def test_missing_flow_redistributes_weight():
    """Missing flow score redistributes its weight to other components."""
    # (6.0*0.45 + 4.0*0.20) / 0.65 = 3.5 / 0.65 = 5.4
    assert compute_composite(None, 6.0, 4.0) == 5.4


def test_all_missing_returns_neutral():
    """No sub-scores at all returns the neutral default."""
    assert compute_composite(None, None, None) == 5.0


def test_compute_composite_is_pure_arithmetic():
    """compute_composite applies no guard — a zero flow score is weighted as-is."""
    # 0.0*0.35 + 8.5*0.45 + 8.6*0.20 = 5.545 -> 5.5
    assert compute_composite(0.0, 8.5, 8.6) == 5.5


def test_is_flow_suspect():
    """Guard triggers only when flow is near-zero AND sentiment is strong."""
    assert is_flow_suspect(0.0, 8.5) is True
    assert is_flow_suspect(2.0, 7.0) is True  # At thresholds
    assert is_flow_suspect(2.1, 8.5) is False  # Flow above suspect threshold
    assert is_flow_suspect(0.0, 6.9) is False  # Sentiment below trust threshold
    assert is_flow_suspect(None, 8.5) is False  # Missing flow is not suspect
    assert is_flow_suspect(0.0, None) is False  # No sentiment to contradict


def test_guard_then_compute_excludes_suspect_flow():
    """Caller pattern (scorer.main): suspect flow is dropped before computing."""
    f_score, s_score, c_score = 0.0, 8.5, 8.6
    if is_flow_suspect(f_score, s_score):
        f_score = None
    # (8.5*0.45 + 8.6*0.20) / 0.65 = 8.53 -> 8.5
    assert compute_composite(f_score, s_score, c_score) == 8.5


def test_legitimate_low_flow_still_counts():
    """Low flow with weak reports is a legitimate signal, not suspect data."""
    f_score, s_score, c_score = 0.0, 3.0, 4.0
    assert is_flow_suspect(f_score, s_score) is False
    # 0.0*0.35 + 3.0*0.45 + 4.0*0.20 = 2.15 -> 2.2
    assert compute_composite(f_score, s_score, c_score) == 2.2
