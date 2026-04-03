from bs4 import BeautifulSoup

from .base import BaseScraper


class FlyFishersScraper(BaseScraper):
    """Scraper for The Fly Fishers Place fishing reports."""

    def __init__(self):
        super().__init__(
            name="fly_fishers_place",
            url="https://flyfishersplace.com/category/fishing-reports/",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        article = soup.find("article") or soup.find("div", class_="entry-content")
        if article:
            return article.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
