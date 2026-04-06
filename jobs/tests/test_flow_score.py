"""Tests for flow scoring logic."""

from scorer.flow_score import score_flow


def test_score_within_ideal_range():
    """Flow within ideal range should score 10."""
    assert score_flow("lower-deschutes", 4000.0) == 10.0


def test_score_at_range_boundary():
    """Flow at exact boundary should score 10."""
    assert score_flow("lower-deschutes", 3000.0) == 10.0
    assert score_flow("lower-deschutes", 5000.0) == 10.0


def test_score_below_range():
    """Flow below ideal range should score less than 10."""
    score = score_flow("lower-deschutes", 1000.0)
    assert score is not None
    assert 0 < score < 10


def test_score_above_range():
    """Flow above ideal range should score less than 10."""
    score = score_flow("lower-deschutes", 8000.0)
    assert score is not None
    assert 0 < score < 10


def test_score_none_flow():
    """None flow should return None."""
    assert score_flow("lower-deschutes", None) is None


def test_score_unknown_slug():
    """Unknown slug should return None."""
    assert score_flow("nonexistent-river", 500.0) is None
