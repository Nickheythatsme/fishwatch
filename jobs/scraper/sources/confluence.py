from bs4 import BeautifulSoup

from .base import BaseScraper


class ConfluenceScraper(BaseScraper):
    """Scraper for Confluence Fly Shop fishing reports."""

    def __init__(self):
        super().__init__(
            name="confluence_fly_shop",
            url="https://confluenceflyshop.com/fishing-reports/",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        # Target the main content area of the fishing report
        article = soup.find("article") or soup.find("div", class_="entry-content")
        if article:
            return article.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
