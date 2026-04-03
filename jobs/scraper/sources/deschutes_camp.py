from bs4 import BeautifulSoup

from .base import BaseScraper


class DeschutesCampScraper(BaseScraper):
    """Scraper for Deschutes River Camp fishing reports."""

    def __init__(self):
        super().__init__(
            name="deschutes_camp",
            url="https://deschutescamp.com/fishing-report/",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        article = soup.find("article") or soup.find("div", class_="entry-content")
        if article:
            return article.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
