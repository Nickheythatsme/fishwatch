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

# Relevant USGS stations mapped to water body slugs
USGS_STATIONS = {
    # Central Oregon
    "14092500": "lower-deschutes",
    "14050000": "upper-deschutes",
    "14076500": "middle-deschutes",
    "14087400": "crooked-river",
    "14057500": "fall-river",
    "14091500": "metolius",
    # Oregon (beyond Central)
    "14163150": "mckenzie-river",
    "14166000": "willamette-river",
    "14120000": "hood-river",
    "14337600": "rogue-river",
    "14319500": "north-umpqua-river",
    "11509500": "klamath-river",
    "14142500": "sandy-river",
    "14210000": "clackamas-river",
    # Washington / Idaho (Silver Bow coverage)
    "12422500": "spokane-river",
    "12411000": "nf-coeur-d-alene",
    "12414500": "st-joe-river",
    "13333000": "grande-ronde",
    # Idaho (Fly Fish Food / Silver Creek Outfitters)
    "13150430": "silver-creek",
    "13135500": "big-wood-river",
    "13127000": "big-lost-river",
    "13186000": "sf-boise-river",
}

# Ideal flow ranges (cfs) for good fishing — used by scorer
IDEAL_FLOW_RANGES = {
    # Central Oregon
    "lower-deschutes": (3000, 5000),
    "upper-deschutes": (800, 1500),
    "middle-deschutes": (1000, 2500),
    "crooked-river": (80, 200),
    "fall-river": (100, 250),
    "metolius": (1200, 1800),
    # Oregon (beyond Central)
    "mckenzie-river": (1500, 4000),
    "willamette-river": (4000, 12000),
    "hood-river": (300, 700),
    "rogue-river": (800, 1500),
    "north-umpqua-river": (1200, 2500),
    "klamath-river": (500, 900),
    "sandy-river": (1000, 2500),
    "clackamas-river": (1000, 2500),
    # Washington / Idaho
    "spokane-river": (1500, 3000),
    "nf-coeur-d-alene": (200, 800),
    "st-joe-river": (50, 200),
    "grande-ronde": (700, 2000),
    # Idaho
    "silver-creek": (80, 200),
    "big-wood-river": (100, 500),
    "big-lost-river": (50, 200),
    "sf-boise-river": (300, 1000),
}
