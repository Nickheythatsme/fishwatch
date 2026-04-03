from bs4 import BeautifulSoup

from .base import BaseScraper


class FlyAndFieldScraper(BaseScraper):
    """Scraper for Fly and Field Outfitters fishing reports."""

    def __init__(self):
        super().__init__(
            name="fly_and_field",
            url="https://flyandfield.com/blogs/fishing-reports",
        )

    def extract_content(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        # Shopify blog layout
        article = soup.find("article") or soup.find("div", class_="blog-post")
        if article:
            return article.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)
