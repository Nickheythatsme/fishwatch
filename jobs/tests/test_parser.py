"""Tests for extraction parsing and validation."""

import json

import pytest

from extractor.parser import (
    ExtractionParseError,
    _normalize_report_date,
    _normalize_species,
    parse_extraction,
)


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


def test_parse_extraction_clean_array():
    raw = json.dumps(
        [
            {"water_body": "Davis Lake", "sentiment": "good"},
            {"water_body": "East Lake", "sentiment": "fair"},
        ]
    )
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert len(rows) == 2
    assert rows[0]["_water_body_name"] == "Davis Lake"


def test_parse_extraction_code_fenced_array():
    raw = '```json\n[{"water_body": "Davis Lake", "sentiment": "good"}]\n```'
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Davis Lake"


def test_parse_extraction_single_object_becomes_one_row():
    raw = json.dumps({"water_body": "Davis Lake", "sentiment": "good"})
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Davis Lake"


def test_parse_extraction_non_json_prose_returns_empty():
    raw = "No fishing reports for any of the listed water bodies were found."
    assert parse_extraction(raw, "raw-id", "test_source") == []


def test_parse_extraction_tolerates_trailing_prose_after_array():
    # Exact failure shape from the CI log (run 27915242899): a VALID JSON array
    # followed by a trailing prose line, which previously raised
    # "Extra data: line 3 column 1 (char 357)" -> ExtractionParseError.
    raw = (
        '[{"water_body": "Grande Ronde River", "sentiment": "fair", "species": [], '
        '"fly_patterns": [], "conditions_summary": "Flows dropping, fishing has been fair."}]'
        "\n\nNote: only one water body was mentioned."
    )
    rows = parse_extraction(raw, "raw-id", "test_source")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Grande Ronde River"
    assert rows[0]["sentiment"] == "fair"


def test_parse_extraction_invalid_leading_json_still_raises():
    # Genuinely broken leading JSON (not just trailing data) must still raise.
    raw = '[{"water_body": "Davis Lake", '  # truncated / unterminated
    with pytest.raises(ExtractionParseError):
        parse_extraction(raw, "raw-id", "test_source")
