from bs4 import BeautifulSoup

from .base import BaseScraper


class ODFWScraper(BaseScraper):
    """Scraper for ODFW Central Zone fishing reports."""

    def __init__(self):
        super().__init__(
            name="odfw_central_zone",
            url="https://myodfw.com/recreation-report/fishing-report/central-zone",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        # ODFW uses a specific content region
        content = soup.find("div", class_="field--name-body") or soup.find(
            "div", class_="node__content"
        )
        if content:
            return content.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
