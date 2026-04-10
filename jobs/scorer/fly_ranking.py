"""Fly pattern normalization and ranking for scoring signals."""

from __future__ import annotations

import re
from datetime import date

# Regex to strip size suffixes like "#18", "#16-20", "# 18"
_SIZE_SUFFIX_RE = re.compile(r"\s*#\s*\d+[-–]?\d*\s*$")


def build_alias_map(cur) -> dict[str, str]:
    """Build a lowercased alias -> canonical name lookup from the fly_patterns table."""
    cur.execute("SELECT name, aliases FROM fly_patterns")
    alias_map: dict[str, str] = {}
    for row in cur.fetchall():
        canonical = row[0]
        aliases = row[1] or []
        alias_map[canonical.lower()] = canonical
        for alias in aliases:
            alias_map[alias.lower()] = canonical
    return alias_map


def _normalize_fly(fly: str, alias_map: dict[str, str]) -> str:
    """Normalize a free-form fly string to a canonical name if possible."""
    stripped = _SIZE_SUFFIX_RE.sub("", fly).strip().lower()

    # Exact match after stripping size
    if stripped in alias_map:
        return alias_map[stripped]

    # Check if any alias is a substring of the fly string, or vice versa
    for alias, canonical in alias_map.items():
        if alias in stripped or stripped in alias:
            return canonical

    # No match — return original string as-is
    return fly


def rank_flies(
    reports: list[dict],
    alias_map: dict[str, str],
    today: date | None = None,
    limit: int = 8,
) -> list[str]:
    """Rank flies by mention frequency, source diversity, and recency.

    Returns the top ``limit`` canonical fly names, ordered by score descending.
    """
    if not reports:
        return []

    if today is None:
        today = date.today()

    # Collect per-fly stats: {canonical_name: [(source_name, days_old), ...]}
    fly_mentions: dict[str, list[tuple[str, int]]] = {}

    for r in reports:
        source = r.get("source_name", "unknown")
        report_date = r.get("report_date")
        if report_date is None:
            days_old = 7  # conservative default
        elif isinstance(report_date, date):
            days_old = max((today - report_date).days, 0)
        else:
            days_old = 7

        seen_in_report: set[str] = set()
        for fl in r.get("fly_patterns_mentioned", []):
            canonical = _normalize_fly(fl, alias_map)
            if canonical not in seen_in_report:
                seen_in_report.add(canonical)
                fly_mentions.setdefault(canonical, []).append((source, days_old))

    # Score each fly
    scored: list[tuple[str, float]] = []
    for fly_name, mentions in fly_mentions.items():
        mention_count = len(mentions)
        distinct_sources = len({src for src, _ in mentions})
        source_multiplier = min(1.0 + 0.25 * (distinct_sources - 1), 2.0)

        recency_weights = [0.85**days for _, days in mentions]
        avg_recency = sum(recency_weights) / len(recency_weights)

        score = mention_count * source_multiplier * avg_recency
        scored.append((fly_name, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [name for name, _ in scored[:limit]]
