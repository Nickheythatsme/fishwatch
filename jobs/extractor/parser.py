"""Parse Claude extraction JSON into database rows."""

import json
from typing import Any


def parse_extraction(raw_json: str, raw_report_id: str, source_name: str) -> list[dict]:
    """Parse Claude's JSON response into parsed_report rows."""
    try:
        entries = json.loads(raw_json)
    except json.JSONDecodeError:
        return []

    if not isinstance(entries, list):
        entries = [entries]

    rows = []
    for entry in entries:
        rows.append(
            {
                "raw_report_id": raw_report_id,
                "source_name": source_name,
                "report_date": entry.get("report_date"),
                "sentiment": _normalize_sentiment(entry.get("sentiment")),
                "species_mentioned": entry.get("species", []),
                "fly_patterns_mentioned": entry.get("fly_patterns", []),
                "conditions_summary": entry.get("conditions_summary"),
                "flow_commentary": entry.get("flow_commentary"),
                "water_clarity": entry.get("water_clarity"),
                "raw_extraction": entry,
                # water_body_id will be resolved by matching entry["water_body"]
                "_water_body_name": entry.get("water_body"),
            }
        )

    return rows


VALID_SENTIMENTS = {"excellent", "good", "fair", "poor", "off"}


def _normalize_sentiment(value: Any) -> str | None:
    if not value:
        return None
    normalized = str(value).lower().strip()
    return normalized if normalized in VALID_SENTIMENTS else None
