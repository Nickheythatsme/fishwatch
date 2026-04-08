from playwright.async_api import Page

from .base import BaseScraper

ODFW_BASE_URL = "https://myodfw.com/recreation-report/fishing-report"

ODFW_ZONES = {
    "central-zone": "odfw_central_zone",
    "northwest-zone": "odfw_northwest_zone",
    "southwest-zone": "odfw_southwest_zone",
    "marine-zone": "odfw_marine_zone",
    "columbia-zone": "odfw_columbia_zone",
    "snake-zone": "odfw_snake_zone",
    "southeast-zone": "odfw_southeast_zone",
    "northeast-zone": "odfw_northeast_zone",
    "willamette-zone": "odfw_willamette_zone",
}


class ODFWScraper(BaseScraper):
    """Scraper for ODFW fishing reports.

    Government single-page report. All content on one page, no individual
    posts to navigate into. discover_posts returns [self.url].
    Supports all ODFW zones via the zone_slug parameter.
    """

    def __init__(self, zone_slug: str = "central-zone"):
        if zone_slug not in ODFW_ZONES:
            raise ValueError(f"Unknown ODFW zone '{zone_slug}'. Valid zones: {', '.join(ODFW_ZONES)}")
        name = ODFW_ZONES[zone_slug]
        url = f"{ODFW_BASE_URL}/{zone_slug}"
        super().__init__(name=name, url=url)

    async def discover_posts(self, page: Page) -> list[str]:
        return [self.url]

    async def extract_content(self, page: Page) -> str:
        el = await page.query_selector("#main-content, .field--name-body, .node__content")
        if el:
            return (await el.inner_text()).strip()
        return (await page.inner_text("body")).strip()
