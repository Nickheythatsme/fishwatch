"""Parse Claude extraction JSON into database rows."""

from __future__ import annotations

import json
import logging
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

VALID_SENTIMENTS = {"excellent", "good", "fair", "poor", "off"}


class ExtractionParseError(Exception):
    """Raised when Claude returns unparseable JSON."""


def _strip_code_fences(text: str) -> str:
    """Strip markdown code fences (```json ... ```) from Claude responses."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = text.index("\n") if "\n" in text else len(text)
        text = text[first_newline + 1 :]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def parse_extraction(raw_json: str, raw_report_id: str, source_name: str) -> list[dict]:
    """Parse Claude's JSON response into parsed_report rows."""
    raw_json = _strip_code_fences(raw_json)

    # Claude sometimes returns prose instead of [] when no water bodies match.
    # Treat non-JSON responses as empty extraction rather than hard failures.
    if not raw_json.lstrip().startswith(("[", "{")):
        logger.info(f"Non-JSON response (likely no matching water bodies): {raw_json[:200]}")
        return []

    try:
        # Use raw_decode (not json.loads) so a VALID leading JSON value followed by
        # trailing content does not blow up with "Extra data". Claude occasionally
        # appends a prose line after the closing ] (the observed failure mode), e.g.
        #   [ ... ]\n\nNote: only one water body was mentioned.
        # raw_decode parses the FIRST JSON value and returns where it stopped; we
        # take that value and ignore the tail. If the tail were actually more array
        # elements (rare and not observed), we deliberately prefer the correctness of
        # the leading value rather than silently merging ambiguous concatenated data.
        entries, end_idx = json.JSONDecoder().raw_decode(raw_json.lstrip())
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Claude: {e}")
        logger.debug(f"Raw JSON: {raw_json[:500]}")
        raise ExtractionParseError(str(e)) from e

    tail = raw_json.lstrip()[end_idx:].strip()
    if tail:
        logger.info(f"Ignoring trailing data after JSON value ({len(tail)} chars): {tail[:200]}")

    if not isinstance(entries, list):
        entries = [entries]

    rows = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        rows.append(
            {
                "raw_report_id": raw_report_id,
                "source_name": source_name,
                "report_date": _normalize_report_date(entry.get("report_date")),
                "sentiment": _normalize_sentiment(entry.get("sentiment")),
                "species_mentioned": _normalize_species(entry.get("species")),
                "fly_patterns_mentioned": entry.get("fly_patterns") or [],
                "conditions_summary": entry.get("conditions_summary"),
                "flow_commentary": entry.get("flow_commentary"),
                "water_clarity": entry.get("water_clarity"),
                "hatches": _normalize_hatches(entry.get("hatches")),
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


def _normalize_species(value: Any) -> list[str]:
    """Lowercase, trim, and de-duplicate species names.

    The LLM returns species in whatever casing it finds in the report text
    ("Trout" vs "trout"); canonicalize to lowercase so downstream consumers
    (filters, scoring/aggregation) don't have to lowercase defensively.
    """
    if not value or not isinstance(value, list):
        return []
    seen: set[str] = set()
    result: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        normalized = item.strip().lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _normalize_report_date(value: Any) -> str | None:
    """Validate report_date is an ISO date (YYYY-MM-DD). Returns None if not.

    The caller falls back to the scrape date for None, and clamps dates that
    land in the future (LLM hallucination).
    """
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value.strip()).isoformat()
    except ValueError:
        # Expected for free-form dates ("last Tuesday"); caller falls back to
        # the scrape date. Logged at INFO to avoid noise.
        logger.info(f"Non-ISO report_date from extraction, using scrape date: {value!r}")
        return None


def _normalize_hatches(value: Any) -> list[dict]:
    """Validate and normalize hatches array. Each hatch must have a 'name' field."""
    if not value or not isinstance(value, list):
        return []
    valid = []
    for item in value:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not name or not isinstance(name, str):
            continue
        valid.append(
            {
                "name": name,
                "stage": item.get("stage") if isinstance(item.get("stage"), str) else None,
                "timing": item.get("timing") if isinstance(item.get("timing"), str) else None,
            }
        )
    return valid
