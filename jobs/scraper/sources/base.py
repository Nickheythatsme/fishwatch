import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timezone

import httpx


class BaseScraper(ABC):
    """Base class for all fishing report scrapers."""

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url
        self.client = httpx.Client(
            timeout=30,
            headers={
                "User-Agent": "FishSignal/1.0 (fishing report aggregator)"
            },
        )

    def fetch(self) -> dict:
        """Fetch the page and return raw HTML + metadata."""
        response = self.client.get(self.url)
        response.raise_for_status()
        raw_html = response.text

        return {
            "source_name": self.name,
            "source_url": self.url,
            "raw_html": raw_html,
            "content_hash": hashlib.sha256(
                self.extract_content(raw_html).encode()
            ).hexdigest(),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    @abstractmethod
    def extract_content(self, html: str) -> str:
        """Extract the main report content from raw HTML.

        Subclasses implement this to isolate the fishing report text
        from navigation, ads, sidebars, etc. The extracted text is
        used for content hashing (dedup) and passed to the LLM.
        """
        ...
