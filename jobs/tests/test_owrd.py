"""Tests for OWRD gauge data parsing."""

from scraper.sources.owrd import parse_owrd_tsv

SAMPLE_TSV = (
    "station_nbr\trecord_date\tinstananteous_flow_cfs\tpublished_status\n"
    "14080500\t06-01-2026 00:00\t233   \tRAW\t06-02-2026 14:03\n"
    "14080500\t06-01-2026 00:15\t235   \tRAW\t06-02-2026 14:03\n"
    "14080500\t06-01-2026 00:30\t233   \tRAW\t06-02-2026 14:03\n"
)

FETCHED_AT = "2026-06-02T21:00:00+00:00"


def test_parses_all_rows():
    readings = parse_owrd_tsv(SAMPLE_TSV, "14080500", "crooked-river", FETCHED_AT)
    assert len(readings) == 3
    assert [r["flow_cfs"] for r in readings] == [233.0, 235.0, 233.0]


def test_reading_fields():
    readings = parse_owrd_tsv(SAMPLE_TSV, "14080500", "crooked-river", FETCHED_AT)
    first = readings[0]
    assert first["station_id"] == "14080500"
    assert first["water_body_slug"] == "crooked-river"
    assert first["gauge_height_ft"] is None
    assert first["water_temp_f"] is None
    assert first["fetched_at"] == FETCHED_AT


def test_converts_pacific_to_utc():
    """OWRD timestamps are Pacific local time; June 1 is PDT (UTC-7)."""
    readings = parse_owrd_tsv(SAMPLE_TSV, "14080500", "crooked-river", FETCHED_AT)
    assert readings[0]["measured_at"] == "2026-06-01T07:00:00+00:00"


def test_skips_missing_flow_values():
    tsv = (
        "station_nbr\trecord_date\tinstananteous_flow_cfs\tpublished_status\n"
        "14080500\t06-02-2026 00:00\t\tMissing\t06-02-2026 14:03\n"
        "14080500\t06-02-2026 00:15\t151   \tRAW\t06-02-2026 14:03\n"
    )
    readings = parse_owrd_tsv(tsv, "14080500", "crooked-river", FETCHED_AT)
    assert len(readings) == 1
    assert readings[0]["flow_cfs"] == 151.0


def test_skips_malformed_rows():
    tsv = (
        "station_nbr\trecord_date\tinstananteous_flow_cfs\tpublished_status\n"
        "garbage line\n"
        "14080500\tnot-a-date\tabc\tRAW\n"
        "14080500\t06-02-2026 00:15\t151\tRAW\t06-02-2026 14:03\n"
    )
    readings = parse_owrd_tsv(tsv, "14080500", "crooked-river", FETCHED_AT)
    assert len(readings) == 1


def test_empty_response():
    assert parse_owrd_tsv("", "14080500", "crooked-river", FETCHED_AT) == []
    assert parse_owrd_tsv("header only\n", "14080500", "crooked-river", FETCHED_AT) == []
