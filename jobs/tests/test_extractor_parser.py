"""Tests for the LLM extraction JSON parser."""

import pytest

from extractor.parser import ExtractionParseError, parse_extraction


def _entry(water_body: str = "Lower Deschutes River") -> str:
    return (
        '{"water_body":"' + water_body + '","sentiment":"good","species":["redside"],'
        '"fly_patterns":["BWO #18"],"conditions_summary":"Fishing well."}'
    )


def test_parses_clean_array():
    rows = parse_extraction(f"[{_entry()}]", "rid", "caddis_fly")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Lower Deschutes River"
    assert rows[0]["sentiment"] == "good"


def test_tolerates_trailing_content_after_array():
    # Regression test for the May 2026 extractor failures: Claude occasionally
    # returns a valid JSON array followed by additional text or a second JSON
    # value, which json.loads rejected with "Extra data: line 3 column 1".
    payload = f"[{_entry()}]\n\nNote: only one water body matched the allow-list."
    rows = parse_extraction(payload, "rid", "caddis_fly")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Lower Deschutes River"


def test_tolerates_trailing_second_json_value():
    payload = f"[{_entry()}]\n[{_entry('Metolius River')}]"
    rows = parse_extraction(payload, "rid", "caddis_fly")
    # Only the first JSON value is consumed; trailing values are ignored.
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Lower Deschutes River"


def test_strips_code_fences():
    payload = f"```json\n[{_entry()}]\n```"
    rows = parse_extraction(payload, "rid", "caddis_fly")
    assert len(rows) == 1


def test_strips_code_fences_with_trailing_content():
    payload = f"```json\n[{_entry()}]\n```\n\nThat's the only relevant water body."
    rows = parse_extraction(payload, "rid", "caddis_fly")
    assert len(rows) == 1


def test_non_json_prose_returns_empty():
    payload = "No water bodies from the allow-list were mentioned in this report."
    rows = parse_extraction(payload, "rid", "caddis_fly")
    assert rows == []


def test_invalid_json_starting_with_bracket_raises():
    # Genuinely malformed JSON still raises so the caller can log and retry.
    payload = "[{not valid json"
    with pytest.raises(ExtractionParseError):
        parse_extraction(payload, "rid", "caddis_fly")


def test_single_object_wrapped_into_list():
    rows = parse_extraction(_entry(), "rid", "caddis_fly")
    assert len(rows) == 1
    assert rows[0]["_water_body_name"] == "Lower Deschutes River"


def test_empty_array():
    rows = parse_extraction("[]", "rid", "caddis_fly")
    assert rows == []


def test_invalid_sentiment_becomes_none():
    payload = '[{"water_body":"Crooked River","sentiment":"banger"}]'
    rows = parse_extraction(payload, "rid", "caddis_fly")
    assert rows[0]["sentiment"] is None
