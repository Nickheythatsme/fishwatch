"""Parse Claude extraction JSON into database rows."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

VALID_SENTIMENTS = {"excellent", "good", "fair", "poor", "off"}


def parse_extraction(raw_json: str, raw_report_id: str, source_name: str) -> list[dict]:
    """Parse Claude's JSON response into parsed_report rows."""
    try:
        entries = json.loads(raw_json)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Claude: {e}")
        logger.debug(f"Raw JSON: {raw_json[:500]}")
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
                "hatches": entry.get("hatches", []),
                "river_section": entry.get("river_section"),
                "raw_extraction": entry,
                "_water_body_name": entry.get("water_body"),
            }
        )

    return rows


def _normalize_sentiment(value: Any) -> str | None:
    if not value:
        return None
    normalized = str(value).lower().strip()
    return normalized if normalized in VALID_SENTIMENTS else None
