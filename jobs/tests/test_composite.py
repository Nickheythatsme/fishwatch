"""Tests for composite signal computation."""

from scorer.composite import compute_composite, is_flow_suspect


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


def test_disagreement_guard_excludes_suspect_flow():
    """A near-zero flow score with strong reports is excluded from the composite."""
    # Without guard: 0.0*0.35 + 8.5*0.45 + 8.6*0.20 = 5.545 -> 5.5
    # With guard, flow dropped: (8.5*0.45 + 8.6*0.20) / 0.65 = 8.53 -> 8.5
    assert compute_composite(0.0, 8.5, 8.6) == 8.5


def test_disagreement_guard_not_triggered_by_weak_reports():
    """Low flow score with weak reports is a legitimate signal, not suspect data."""
    # 0.0*0.35 + 3.0*0.45 + 4.0*0.20 = 2.15 -> 2.2
    assert compute_composite(0.0, 3.0, 4.0) == 2.2


def test_disagreement_guard_not_triggered_by_moderate_flow():
    """A moderate flow score is kept even when reports are strong."""
    # 5.0*0.35 + 8.5*0.45 + 8.6*0.20 = 1.75 + 3.825 + 1.72 = 7.295 -> 7.3
    assert compute_composite(5.0, 8.5, 8.6) == 7.3


def test_is_flow_suspect():
    """Guard triggers only when flow is near-zero AND sentiment is strong."""
    assert is_flow_suspect(0.0, 8.5) is True
    assert is_flow_suspect(2.0, 7.0) is True  # At thresholds
    assert is_flow_suspect(2.1, 8.5) is False  # Flow above suspect threshold
    assert is_flow_suspect(0.0, 6.9) is False  # Sentiment below trust threshold
    assert is_flow_suspect(None, 8.5) is False  # Missing flow is not suspect
    assert is_flow_suspect(0.0, None) is False  # No sentiment to contradict
