"""Tests for extraction parsing and validation."""

import json

from extractor.parser import _normalize_report_date, _normalize_species, parse_extraction


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


def test_normalize_species_lowercases_dedupes_and_preserves_order():
    assert _normalize_species(["Trout", "trout", "TROUT"]) == ["trout"]
    assert _normalize_species([" Steelhead ", "Trout", "steelhead"]) == ["steelhead", "trout"]


def test_normalize_species_handles_invalid_input():
    assert _normalize_species(None) == []
    assert _normalize_species([]) == []
    assert _normalize_species("Trout") == []  # not a list
    assert _normalize_species(["Trout", 123, None, ""]) == ["trout"]  # non-strings/blanks skipped


def test_parse_extraction_normalizes_species():
    raw = json.dumps(
        [
            {"water_body": "Davis Lake", "species": ["Trout", "Steelhead", "trout"]},
        ]
    )
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert rows[0]["species_mentioned"] == ["trout", "steelhead"]
