"""Tests for fly pattern normalization and ranking."""

from datetime import date

from scorer.fly_ranking import _normalize_fly, rank_flies

# Simulated alias map matching seed data
ALIAS_MAP = {
    "blue wing olive": "Blue Wing Olive",
    "bwo": "Blue Wing Olive",
    "baetis": "Blue Wing Olive",
    "blue wing": "Blue Wing Olive",
    "pale morning dun": "Pale Morning Dun",
    "pmd": "Pale Morning Dun",
    "pale morning": "Pale Morning Dun",
    "pheasant tail": "Pheasant Tail",
    "pt": "Pheasant Tail",
    "pheasant tail nymph": "Pheasant Tail",
    "ptn": "Pheasant Tail",
    "elk hair caddis": "Elk Hair Caddis",
    "ehc": "Elk Hair Caddis",
    "elk hair": "Elk Hair Caddis",
    "zebra midge": "Zebra Midge",
    "zebra": "Zebra Midge",
    "midge": "Zebra Midge",
    "san juan worm": "San Juan Worm",
    "worm": "San Juan Worm",
    "squirmy wormy": "San Juan Worm",
}

TODAY = date(2026, 4, 10)


class TestNormalizeFly:
    def test_exact_match(self):
        assert _normalize_fly("Blue Wing Olive", ALIAS_MAP) == "Blue Wing Olive"

    def test_alias_match(self):
        assert _normalize_fly("BWO", ALIAS_MAP) == "Blue Wing Olive"

    def test_strip_size_suffix(self):
        assert _normalize_fly("BWO #18", ALIAS_MAP) == "Blue Wing Olive"

    def test_strip_size_range(self):
        assert _normalize_fly("PMD #14-18", ALIAS_MAP) == "Pale Morning Dun"

    def test_case_insensitive(self):
        assert _normalize_fly("pheasant tail", ALIAS_MAP) == "Pheasant Tail"

    def test_unmatched_preserved(self):
        assert _normalize_fly("Secret Local Pattern #12", ALIAS_MAP) == "Secret Local Pattern #12"

    def test_substring_match(self):
        assert _normalize_fly("pheasant tail nymph", ALIAS_MAP) == "Pheasant Tail"

    def test_empty_after_strip_returns_original(self):
        """Size-only input like '#18' should not falsely match an alias."""
        result = _normalize_fly("#18", ALIAS_MAP)
        assert result == "#18"

    def test_blank_string_returns_original(self):
        result = _normalize_fly("  ", ALIAS_MAP)
        assert result == "  "

    def test_longest_alias_wins(self):
        """When multiple aliases match, the longest one wins for determinism."""
        # "pheasant tail nymph" is longer than "pheasant tail" and both are aliases
        alias_map = {
            "pheasant tail": "Pheasant Tail",
            "pheasant tail nymph": "Pheasant Tail",
            "pt": "Pheasant Tail",
            "stone": "Stonefly Nymph",
        }
        assert _normalize_fly("pheasant tail nymph #14", alias_map) == "Pheasant Tail"

    def test_short_input_does_not_match_longer_alias(self):
        """Short input 'stone' must NOT match canonical 'golden stone' (input-in-alias false positive)."""
        alias_map = {
            "golden stone": "Golden Stonefly",
            "stone": "Stonefly Nymph",
        }
        # "stone" exactly matches the "stone" alias, not "golden stone"
        assert _normalize_fly("stone #8", alias_map) == "Stonefly Nymph"

    def test_input_not_contained_in_alias(self):
        """Input 'stone' should not match alias 'golden stone' via input-in-alias direction."""
        alias_map = {
            "golden stone": "Golden Stonefly",
        }
        # "stone" is contained in "golden stone" but "golden stone" is NOT in "stone"
        # so no match; original is returned
        assert _normalize_fly("stone #8", alias_map) == "stone #8"


class TestRankFlies:
    def test_empty_reports(self):
        assert rank_flies([], ALIAS_MAP, today=TODAY) == []

    def test_frequency_ranking(self):
        """Fly mentioned in more reports ranks higher."""
        reports = [
            {"fly_patterns_mentioned": ["BWO #18", "PMD #16"], "source_name": "shop_a", "report_date": TODAY},
            {"fly_patterns_mentioned": ["BWO #18"], "source_name": "shop_a", "report_date": TODAY},
            {"fly_patterns_mentioned": ["BWO #18"], "source_name": "shop_a", "report_date": TODAY},
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        assert result[0] == "Blue Wing Olive"
        assert "Pale Morning Dun" in result

    def test_source_diversity_boost(self):
        """Fly from multiple sources outranks fly from single source with same mention count."""
        reports = [
            {"fly_patterns_mentioned": ["BWO"], "source_name": "shop_a", "report_date": TODAY},
            {"fly_patterns_mentioned": ["BWO"], "source_name": "shop_b", "report_date": TODAY},
            {"fly_patterns_mentioned": ["PMD"], "source_name": "shop_a", "report_date": TODAY},
            {"fly_patterns_mentioned": ["PMD"], "source_name": "shop_a", "report_date": TODAY},
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        # BWO: 2 mentions * 1.25 (2 sources) * 1.0 (today) = 2.5
        # PMD: 2 mentions * 1.0 (1 source) * 1.0 (today) = 2.0
        assert result[0] == "Blue Wing Olive"

    def test_recency_weighting(self):
        """More recent fly outranks older fly with same mention count."""
        reports = [
            {"fly_patterns_mentioned": ["BWO"], "source_name": "shop_a", "report_date": TODAY},
            {
                "fly_patterns_mentioned": ["PMD"],
                "source_name": "shop_a",
                "report_date": date(2026, 4, 3),  # 7 days old
            },
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        assert result[0] == "Blue Wing Olive"

    def test_limit_caps_output(self):
        """Output is capped at the limit."""
        flies = [f"Fly Pattern {i}" for i in range(20)]
        reports = [
            {"fly_patterns_mentioned": flies, "source_name": "shop_a", "report_date": TODAY},
        ]
        result = rank_flies(reports, {}, today=TODAY, limit=5)
        assert len(result) == 5

    def test_variants_collapse(self):
        """Different aliases of the same fly collapse to one canonical entry."""
        reports = [
            {
                "fly_patterns_mentioned": ["BWO #18", "Blue Wing Olive #20", "Baetis"],
                "source_name": "shop_a",
                "report_date": TODAY,
            },
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        bwo_entries = [f for f in result if f == "Blue Wing Olive"]
        assert len(bwo_entries) == 1

    def test_unmatched_flies_included(self):
        """Flies not in the alias map are still included in results."""
        reports = [
            {"fly_patterns_mentioned": ["Sparkle Dun #16"], "source_name": "shop_a", "report_date": TODAY},
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        assert "Sparkle Dun #16" in result

    def test_deduplicates_within_single_report(self):
        """Same fly mentioned twice in one report counts as one mention."""
        reports = [
            {
                "fly_patterns_mentioned": ["BWO #18", "BWO #20"],
                "source_name": "shop_a",
                "report_date": TODAY,
            },
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        assert result.count("Blue Wing Olive") == 1

    def test_null_fly_entries_skipped(self):
        """None and non-string entries in fly_patterns_mentioned are skipped."""
        reports = [
            {
                "fly_patterns_mentioned": [None, "", "BWO #18", 42, None],
                "source_name": "shop_a",
                "report_date": TODAY,
            },
        ]
        result = rank_flies(reports, ALIAS_MAP, today=TODAY)
        assert result == ["Blue Wing Olive"]
