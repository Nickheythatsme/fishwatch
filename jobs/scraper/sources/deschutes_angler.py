from bs4 import BeautifulSoup

from .base import BaseScraper


class DeschutesAnglerScraper(BaseScraper):
    """Scraper for Deschutes Angler fishing reports."""

    def __init__(self):
        super().__init__(
            name="deschutes_angler",
            url="https://deschutesangler.com/blogs/fishing-report",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        article = soup.find("article") or soup.find("div", class_="blog-post")
        if article:
            return article.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
