"""Structured types for scraper health reporting."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class ScraperHealthError(Exception):
    """Raised when a scraper detects a structural health problem."""


class ScraperStatus(Enum):
    SUCCESS = "SUCCESS"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"


@dataclass
class ScraperResult:
    source_name: str
    source_url: str
    status: ScraperStatus
    posts_discovered: int = 0
    posts_extracted: int = 0
    posts_failed: int = 0
    body_fallback_used: bool = False
    error_message: str | None = None
    traceback: str | None = None
    artifact_paths: list[str] = field(default_factory=list)
    raw_reports: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize for JSON summary (excludes raw_reports)."""
        return {
            "source_name": self.source_name,
            "source_url": self.source_url,
            "status": self.status.value,
            "posts_discovered": self.posts_discovered,
            "posts_extracted": self.posts_extracted,
            "posts_failed": self.posts_failed,
            "body_fallback_used": self.body_fallback_used,
            "error_message": self.error_message,
            "traceback": self.traceback,
            "artifact_paths": self.artifact_paths,
        }
