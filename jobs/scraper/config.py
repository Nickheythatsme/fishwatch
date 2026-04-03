SHOP_SOURCES = [
    {
        "name": "confluence_fly_shop",
        "url": "https://confluenceflyshop.com/fishing-reports/",
        "scraper": "confluence",
    },
    {
        "name": "fly_fishers_place",
        "url": "https://flyfishersplace.com/category/fishing-reports/",
        "scraper": "fly_fishers",
    },
    {
        "name": "fly_and_field",
        "url": "https://flyandfield.com/blogs/fishing-reports",
        "scraper": "fly_and_field",
    },
    {
        "name": "deschutes_angler",
        "url": "https://deschutesangler.com/blogs/fishing-report",
        "scraper": "deschutes_angler",
    },
    {
        "name": "deschutes_camp",
        "url": "https://deschutescamp.com/fishing-report/",
        "scraper": "deschutes_camp",
    },
    {
        "name": "odfw_central_zone",
        "url": "https://myodfw.com/recreation-report/fishing-report/central-zone",
        "scraper": "odfw",
    },
]

# USGS Water Services API — instantaneous values
USGS_BASE_URL = "https://waterservices.usgs.gov/nwis/iv/"
USGS_PARAMS = {
    "format": "json",
    "parameterCd": "00060,00065,00010",  # flow, gauge height, water temp
    "siteStatus": "active",
}

# Relevant USGS stations for Central Oregon
USGS_STATIONS = {
    "14092500": "lower-deschutes",
    "14050000": "upper-deschutes",
    "14076500": "middle-deschutes",
    "14087400": "crooked-river",
    "14057500": "fall-river",
    "14091500": "metolius",
}

# Ideal flow ranges (cfs) for good fishing — used by scorer
IDEAL_FLOW_RANGES = {
    "lower-deschutes": (3000, 5000),
    "upper-deschutes": (800, 1500),
    "middle-deschutes": (1000, 2500),
    "crooked-river": (80, 200),
    "fall-river": (100, 250),
    "metolius": (1200, 1800),
}
