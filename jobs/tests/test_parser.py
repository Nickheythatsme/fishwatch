"""Tests for extraction parsing and validation."""

import json

from extractor.parser import _normalize_report_date, parse_extraction


def test_normalize_valid_iso_date():
    assert _normalize_report_date("2026-05-21") == "2026-05-21"
    assert _normalize_report_date(" 2026-05-21 ") == "2026-05-21"


def test_normalize_invalid_dates():
    assert _normalize_report_date(None) is None
    assert _normalize_report_date("") is None
    assert _normalize_report_date("May 21, 2026") is None
    assert _normalize_report_date("2026-13-45") is None
    assert _normalize_report_date(20260521) is None


def test_parse_extraction_normalizes_report_date():
    raw = json.dumps(
        [
            {"water_body": "Davis Lake", "sentiment": "excellent", "report_date": "2026-05-21"},
            {"water_body": "East Lake", "sentiment": "good", "report_date": "last Tuesday"},
        ]
    )
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert rows[0]["report_date"] == "2026-05-21"
    assert rows[1]["report_date"] is None  # Invalid date dropped; caller uses scrape date
